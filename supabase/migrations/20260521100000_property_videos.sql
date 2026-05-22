-- Varios videos por propiedad (YouTube/Vimeo/MP4 subido o combinados).

alter table public.properties
  add column if not exists property_videos jsonb not null default '[]'::jsonb;

comment on column public.properties.property_videos is
  'Lista Viterra: [{ "id", "kind": "external"|"storage", "url"?, "storagePath"?, "label"? }].';
