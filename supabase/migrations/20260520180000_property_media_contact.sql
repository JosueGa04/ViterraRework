-- Contacto, video y tour 3D por propiedad + bucket property-media (hasta 5 GB por archivo).

alter table public.properties
  add column if not exists contact_phone text,
  add column if not exists contact_whatsapp text,
  add column if not exists video_url text,
  add column if not exists video_storage_path text,
  add column if not exists tour_3d_url text;

comment on column public.properties.contact_phone is 'Teléfono de contacto para esta ficha (opcional; fallback sitio).';
comment on column public.properties.contact_whatsapp is 'WhatsApp solo dígitos, ej. 523318878494.';
comment on column public.properties.video_url is 'URL externa de video (YouTube, Vimeo, MP4 CDN).';
comment on column public.properties.video_storage_path is 'Ruta en bucket property-media si el video se subió al CRM.';
comment on column public.properties.tour_3d_url is 'URL embed de tour 3D (Matterport, Kuula, etc.).';

-- 5 GB = 5368709120 bytes
insert into storage.buckets (id, name, public, file_size_limit)
values ('property-media', 'property-media', true, 5368709120)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists property_media_select_public on storage.objects;
create policy property_media_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'property-media');

drop policy if exists property_media_insert_editors on storage.objects;
create policy property_media_insert_editors
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-media'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'manage_properties' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists property_media_update_editors on storage.objects;
create policy property_media_update_editors
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-media'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'manage_properties' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );

drop policy if exists property_media_delete_editors on storage.objects;
create policy property_media_delete_editors
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-media'
    and exists (
      select 1
      from public.tokko_users tu
      where tu.id = auth.uid()
        and tu.deleted_at is null
        and (
          tu.role = 'admin'
          or 'manage_properties' = any (coalesce(tu.permissions, '{}'::text[]))
        )
    )
  );
