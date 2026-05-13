-- Contenido editable del sitio público (JSON por página). Lectura pública; escritura solo admin / edit_site.

create table if not exists public.site_content_sections (
  page text primary key
    constraint site_content_sections_page_chk
      check (page in ('home', 'contact', 'services', 'about', 'developments')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.site_content_sections is
  'Textos e imágenes del sitio; payload se fusiona en cliente con DEFAULT_SITE_CONTENT.';

create or replace function public.site_content_sections_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_sections_set_updated_at on public.site_content_sections;
create trigger site_content_sections_set_updated_at
  before update on public.site_content_sections
  for each row
  execute function public.site_content_sections_set_updated_at();

alter table public.site_content_sections enable row level security;

-- Lectura pública (sitio sin sesión).
drop policy if exists site_content_sections_select_all on public.site_content_sections;
create policy site_content_sections_select_all
  on public.site_content_sections
  for select
  to anon, authenticated
  using (true);

-- Escritura: admin o permiso edit_site (misma condición en insert/update/delete).
drop policy if exists site_content_sections_insert_editors on public.site_content_sections;
create policy site_content_sections_insert_editors
  on public.site_content_sections
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists site_content_sections_update_editors on public.site_content_sections;
create policy site_content_sections_update_editors
  on public.site_content_sections
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists site_content_sections_delete_editors on public.site_content_sections;
create policy site_content_sections_delete_editors
  on public.site_content_sections
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

grant select on public.site_content_sections to anon, authenticated;
grant insert, update, delete on public.site_content_sections to authenticated;

-- Semilla: filas vacías (el cliente fusiona con defaults).
insert into public.site_content_sections (page, payload)
values
  ('home', '{}'::jsonb),
  ('contact', '{}'::jsonb),
  ('services', '{}'::jsonb),
  ('about', '{}'::jsonb),
  ('developments', '{}'::jsonb)
on conflict (page) do nothing;

-- Realtime (varios editores / pestañas).
alter publication supabase_realtime add table public.site_content_sections;

-- Bucket público para imágenes del sitio (CMS).
insert into storage.buckets (id, name, public, file_size_limit)
values ('site', 'site', true, 10485760)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists site_storage_select_public on storage.objects;
create policy site_storage_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'site');

drop policy if exists site_storage_insert_editors on storage.objects;
create policy site_storage_insert_editors
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists site_storage_update_editors on storage.objects;
create policy site_storage_update_editors
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'site'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  )
  with check (
    bucket_id = 'site'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists site_storage_delete_editors on storage.objects;
create policy site_storage_delete_editors
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'site'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'edit_site' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );
