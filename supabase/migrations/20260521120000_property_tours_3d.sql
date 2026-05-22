-- Varios recorridos 3D por propiedad (URLs embed Matterport, Kuula, etc.).

alter table public.properties
  add column if not exists property_tours_3d jsonb not null default '[]'::jsonb;

comment on column public.properties.property_tours_3d is
  'Lista Viterra: [{ "id", "url", "label"? }]. tour_3d_url conserva el primero para compatibilidad.';
