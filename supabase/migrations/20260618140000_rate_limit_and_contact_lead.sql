-- Rate limiting para formularios públicos + RPC de contacto general.

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  blocked_until timestamptz,
  primary key (bucket_key, window_start)
);

create index if not exists rate_limit_buckets_blocked_until_idx
  on public.rate_limit_buckets (blocked_until)
  where blocked_until is not null;

alter table public.rate_limit_buckets enable row level security;

-- Solo funciones SECURITY DEFINER acceden; sin políticas para clientes.
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

create or replace function public.viterra_check_rate_limit(
  p_bucket_key text,
  p_max_attempts integer default 5,
  p_window_seconds integer default 900,
  p_block_seconds integer default 900
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(trim(coalesce(p_bucket_key, '')));
  v_now timestamptz := now();
  v_window timestamptz := date_trunc('second', v_now - make_interval(secs => p_window_seconds));
  v_count integer;
  v_blocked timestamptz;
begin
  if length(v_key) < 3 then
    raise exception 'rate_limit_invalid_key';
  end if;

  select blocked_until
  into v_blocked
  from public.rate_limit_buckets
  where bucket_key = v_key
    and blocked_until is not null
    and blocked_until > v_now
  order by blocked_until desc
  limit 1;

  if found then
    raise exception 'rate_limit_exceeded';
  end if;

  delete from public.rate_limit_buckets
  where bucket_key = v_key
    and window_start < v_now - make_interval(secs => p_window_seconds * 2);

  insert into public.rate_limit_buckets (bucket_key, window_start, request_count)
  values (v_key, date_trunc('minute', v_now), 1)
  on conflict (bucket_key, window_start)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  if v_count > p_max_attempts then
    update public.rate_limit_buckets
    set blocked_until = v_now + make_interval(secs => p_block_seconds)
    where bucket_key = v_key
      and window_start = date_trunc('minute', v_now);

    raise exception 'rate_limit_exceeded';
  end if;
end;
$$;

revoke all on function public.viterra_check_rate_limit(text, integer, integer, integer) from public;
grant execute on function public.viterra_check_rate_limit(text, integer, integer, integer) to postgres, service_role;

-- Actualiza submit_catalog_lead: rate limit + permite contacto sin catálogo vía overload.
create or replace function public.submit_catalog_lead(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_property_id uuid,
  p_development_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_tokko text := 'viterra_catalog_' || replace(gen_random_uuid()::text, '-', '');
  v_prop_status text;
  v_interest text;
  v_property_type text;
  v_budget numeric;
  v_location text;
  v_assigned_to text;
  v_assigned_uid text;
  v_related_prop uuid;
  v_related_dev uuid;
  v_notes jsonb := '[]'::jsonb;
  v_activity jsonb;
  v_note_id text;
  v_day date := (v_now at time zone 'UTC')::date;
  v_source text := 'Sitio web · ficha de catálogo';
  nm text := trim(coalesce(p_name, ''));
  em text := trim(lower(coalesce(p_email, '')));
  ph text := trim(coalesce(p_phone, ''));
  msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  perform public.viterra_check_rate_limit('catalog_lead:' || em);

  if length(nm) < 2 or length(nm) > 200 then
    raise exception 'invalid_name';
  end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 320 then
    raise exception 'invalid_email';
  end if;
  if length(ph) < 8 or length(ph) > 40 then
    raise exception 'invalid_phone';
  end if;
  if msg is not null and length(msg) > 4000 then
    raise exception 'invalid_message';
  end if;

  if p_property_id is not null and p_development_id is not null then
    raise exception 'at_most_one_catalog_target';
  end if;

  if p_property_id is null and p_development_id is null then
    v_interest := 'compra';
    v_property_type := '—';
    v_budget := 0;
    v_location := '—';
    v_assigned_to := '';
    v_assigned_uid := '';
    v_related_prop := null;
    v_related_dev := null;
    v_source := 'Sitio web · contacto';
  elsif p_property_id is not null then
    select
      pr.status,
      coalesce(nullif(trim(pr.type), ''), '—'),
      coalesce(pr.price, 0),
      coalesce(nullif(trim(pr.location), ''), '—'),
      nullif(
        trim(
          coalesce(
            pr.payload #>> '{agent,name}',
            pr.payload ->> 'agent_name',
            pr.payload ->> 'assigned_to'
          )
        ),
        ''
      ),
      nullif(
        trim(
          coalesce(
            pr.payload #>> '{agent,id}',
            pr.payload ->> 'user_id',
            pr.payload ->> 'agent_id'
          )
        ),
        ''
      )
    into
      v_prop_status,
      v_property_type,
      v_budget,
      v_location,
      v_assigned_to,
      v_assigned_uid
    from public.properties pr
    where pr.id = p_property_id;

    if not found then
      raise exception 'property_not_found';
    end if;

    v_interest := case
      when lower(trim(coalesce(v_prop_status, ''))) in ('alquiler', 'renta', 'rent') then 'alquiler'
      else 'compra'
    end;
    v_related_prop := p_property_id;
    v_related_dev := null;
  else
    select
      coalesce(nullif(trim(d.type), ''), '—'),
      coalesce(pr_agg.min_price, 0::numeric),
      coalesce(
        nullif(trim(coalesce(d.location, '')), ''),
        nullif(trim(coalesce(d.full_address, '')), ''),
        '—'
      ),
      nullif(trim(coalesce(d.in_charge_name, '')), ''),
      nullif(trim(coalesce(d.payload #>> '{users_in_charge,id}', '')), '')
    into
      v_property_type,
      v_budget,
      v_location,
      v_assigned_to,
      v_assigned_uid
    from public.developments d
    left join lateral (
      select min(p.price) filter (where p.price is not null and p.price > 0) as min_price
      from public.properties p
      where p.development_tokko_id is not null
        and d.tokko_id is not null
        and lower(trim(p.development_tokko_id)) = lower(trim(d.tokko_id))
    ) pr_agg on true
    where d.id = p_development_id;

    if not found then
      raise exception 'development_not_found';
    end if;

    v_interest := 'compra';
    v_related_prop := null;
    v_related_dev := p_development_id;
  end if;

  v_activity := jsonb_build_array(
    jsonb_build_object(
      'id', 'lact_' || gen_random_uuid()::text,
      'type', 'created',
      'createdAt', to_jsonb(v_now),
      'description', case
        when p_property_id is null and p_development_id is null then 'Consulta desde página de contacto'
        else 'Consulta desde ficha del sitio web'
      end
    )
  );

  if msg is not null then
    v_note_id := 'lnote_' || gen_random_uuid()::text;
    v_notes := jsonb_build_array(
      jsonb_build_object(
        'id', v_note_id,
        'date', v_day::text,
        'body', msg
      )
    );
  end if;

  insert into public.leads (
    id,
    tokko_id,
    lead_kind,
    name,
    email,
    phone,
    interest,
    property_type,
    budget,
    location,
    status,
    priority_stars,
    source,
    assigned_to,
    assigned_to_user_id,
    created_at,
    last_contact,
    payload,
    synced_at,
    updated_at,
    deleted_at
  )
  values (
    v_id,
    v_tokko,
    'web_contact',
    nm,
    em,
    ph,
    v_interest,
    v_property_type,
    coalesce(v_budget, 0),
    v_location,
    'nuevo',
    3,
    v_source,
    coalesce(v_assigned_to, ''),
    coalesce(v_assigned_uid, ''),
    v_now,
    v_now,
    jsonb_strip_nulls(
      jsonb_build_object(
        'pipelineGroupId', '__default__',
        'activity', v_activity,
        'clientNotes', v_notes,
        'relatedPropertyId', case when v_related_prop is null then null else v_related_prop::text end,
        'relatedDevelopmentId', case when v_related_dev is null then null else v_related_dev::text end
      )
    ),
    v_now,
    v_now,
    null
  );

  return v_id;
end;
$$;

comment on function public.submit_catalog_lead(text, text, text, text, uuid, uuid) is
  'Inserta lead web_contact desde ficha catálogo o contacto general; incluye rate limiting por email.';

revoke all on function public.submit_catalog_lead(text, text, text, text, uuid, uuid) from public;
grant execute on function public.submit_catalog_lead(text, text, text, text, uuid, uuid) to anon, authenticated;
