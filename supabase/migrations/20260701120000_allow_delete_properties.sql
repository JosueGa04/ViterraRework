-- Otorgar permisos de eliminación y crear política RLS para la tabla properties
grant delete on public.properties to authenticated;

create policy properties_delete_inventory
  on public.properties
  for delete
  to authenticated
  using (public.viterra_can_manage_inventory());
