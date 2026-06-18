-- Impide que usuarios no-admin cambien su propio role/permissions (aunque tengan manage_users).

create or replace function public.tokko_users_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.viterra_is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.permissions is distinct from old.permissions then
    raise exception 'forbidden_role_change';
  end if;

  return new;
end;
$$;

drop trigger if exists tokko_users_guard_sensitive_columns on public.tokko_users;
create trigger tokko_users_guard_sensitive_columns
  before update on public.tokko_users
  for each row
  execute function public.tokko_users_guard_sensitive_columns();

-- Solo admin puede UPDATE/DELETE filas ajenas; el propio usuario solo perfil no sensible.
drop policy if exists tokko_users_update_admin on public.tokko_users;

create policy tokko_users_update_admin
  on public.tokko_users
  for update
  to authenticated
  using (public.viterra_is_admin())
  with check (public.viterra_is_admin());

create policy tokko_users_update_self_profile
  on public.tokko_users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
