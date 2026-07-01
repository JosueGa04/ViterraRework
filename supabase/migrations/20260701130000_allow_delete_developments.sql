-- Otorgar permisos de eliminación y crear política RLS para la tabla developments
grant delete on public.developments to authenticated;

create policy developments_delete_inventory
  on public.developments
  for delete
  to authenticated
  using (public.viterra_can_manage_inventory());
