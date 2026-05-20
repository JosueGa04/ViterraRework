-- Lead desde formulario público (ficha propiedad / desarrollo): insert controlado sin sesión CRM.
-- SECURITY DEFINER evita abrir INSERT genérico en `leads` para rol `anon`.

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
  nm text := trim(coalesce(p_name, ''));
  em text := trim(lower(coalesce(p_email, '')));
  ph text := trim(coalesce(p_phone, ''));
  msg text := nullif(trim(coalesce(p_message, '')), '');
begin
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

  if (p_property_id is null and p_development_id is null)
     or (p_property_id is not null and p_development_id is not null) then
    raise exception 'exactly_one_catalog_target';
  end if;

  if p_property_id is not null then
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
      'description', 'Consulta desde ficha del sitio web'
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
    'Sitio web · ficha de catálogo',
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
  'Inserta un lead (lead_kind=web_contact) desde el formulario público de ficha propiedad o desarrollo; asignación e interés se derivan de la fila de catálogo.';

revoke all on function public.submit_catalog_lead(text, text, text, text, uuid, uuid) from public;
grant execute on function public.submit_catalog_lead(text, text, text, text, uuid, uuid) to anon, authenticated;
