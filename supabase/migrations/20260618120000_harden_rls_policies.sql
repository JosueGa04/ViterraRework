-- Endurece RLS: reemplaza políticas permisivas documentadas en docs/RLS-CHECKLIST.md

create or replace function public.viterra_my_tokko_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tu.tokko_user_id
  from public.tokko_users tu
  where tu.id = auth.uid()
    and tu.deleted_at is null
  limit 1;
$$;

create or replace function public.viterra_lead_assigned_to_me(p_assigned_uid text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  assigned text := nullif(trim(coalesce(p_assigned_uid, '')), '');
  tok text := public.viterra_my_tokko_user_id();
begin
  if assigned is null then
    return false;
  end if;
  return assigned = auth.uid()::text or (tok is not null and assigned = trim(tok));
end;
$$;

create or replace function public.viterra_can_access_lead(p_assigned_uid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viterra_is_leader()
    or public.viterra_lead_assigned_to_me(p_assigned_uid);
$$;

create or replace function public.viterra_can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viterra_is_admin()
    or public.viterra_has_permission('manage_properties')
    or public.viterra_has_permission('manage_developments');
$$;

create or replace function public.viterra_can_edit_pipeline(p_group_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viterra_is_admin()
    or (
      p_group_id = '__default__'
      and public.viterra_is_leader()
    )
    or public.kpi_is_leader_for_group(p_group_id);
$$;

create or replace function public.viterra_can_read_kpi_scope(p_scope text, p_scope_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viterra_is_admin()
    or p_scope = 'company'
    or (p_scope = 'user' and p_scope_id = auth.uid()::text)
    or (p_scope = 'group' and public.kpi_is_leader_for_group(p_scope_id))
    or (
      p_scope = 'group'
      and exists (
        select 1
        from public.user_group_members m
        where m.group_id::text = p_scope_id
          and m.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.viterra_my_tokko_user_id() from public;
revoke all on function public.viterra_lead_assigned_to_me(text) from public;
revoke all on function public.viterra_can_access_lead(text) from public;
revoke all on function public.viterra_can_manage_inventory() from public;
revoke all on function public.viterra_can_edit_pipeline(text) from public;
revoke all on function public.viterra_can_read_kpi_scope(text, text) from public;
grant execute on function public.viterra_my_tokko_user_id() to authenticated;
grant execute on function public.viterra_lead_assigned_to_me(text) to authenticated;
grant execute on function public.viterra_can_access_lead(text) to authenticated;
grant execute on function public.viterra_can_manage_inventory() to authenticated;
grant execute on function public.viterra_can_edit_pipeline(text) to authenticated;
grant execute on function public.viterra_can_read_kpi_scope(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- leads + lead_client_notes
-- ---------------------------------------------------------------------------
drop policy if exists leads_all_authenticated on public.leads;
drop policy if exists lead_client_notes_all_authenticated on public.lead_client_notes;

create policy leads_select_scoped
  on public.leads
  for select
  to authenticated
  using (public.viterra_can_access_lead(assigned_to_user_id));

create policy leads_insert_manage
  on public.leads
  for insert
  to authenticated
  with check (public.viterra_has_permission('manage_leads'));

create policy leads_update_scoped
  on public.leads
  for update
  to authenticated
  using (public.viterra_can_access_lead(assigned_to_user_id))
  with check (public.viterra_can_access_lead(assigned_to_user_id));

create policy leads_delete_admin
  on public.leads
  for delete
  to authenticated
  using (public.viterra_is_admin());

create policy lead_client_notes_select_scoped
  on public.lead_client_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leads l
      where l.id = lead_client_notes.lead_id
        and public.viterra_can_access_lead(l.assigned_to_user_id)
    )
  );

create policy lead_client_notes_insert_scoped
  on public.lead_client_notes
  for insert
  to authenticated
  with check (
    public.viterra_has_permission('manage_leads')
    and exists (
      select 1
      from public.leads l
      where l.id = lead_client_notes.lead_id
        and public.viterra_can_access_lead(l.assigned_to_user_id)
    )
  );

create policy lead_client_notes_update_scoped
  on public.lead_client_notes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.leads l
      where l.id = lead_client_notes.lead_id
        and public.viterra_can_access_lead(l.assigned_to_user_id)
    )
  )
  with check (
    exists (
      select 1
      from public.leads l
      where l.id = lead_client_notes.lead_id
        and public.viterra_can_access_lead(l.assigned_to_user_id)
    )
  );

create policy lead_client_notes_delete_scoped
  on public.lead_client_notes
  for delete
  to authenticated
  using (
    public.viterra_is_admin()
    or exists (
      select 1
      from public.leads l
      where l.id = lead_client_notes.lead_id
        and public.viterra_can_access_lead(l.assigned_to_user_id)
    )
  );

-- ---------------------------------------------------------------------------
-- properties / developments / development_units
-- ---------------------------------------------------------------------------
drop policy if exists properties_insert_authenticated on public.properties;
drop policy if exists properties_update_authenticated on public.properties;

create policy properties_insert_inventory
  on public.properties
  for insert
  to authenticated
  with check (public.viterra_can_manage_inventory());

create policy properties_update_inventory
  on public.properties
  for update
  to authenticated
  using (public.viterra_can_manage_inventory())
  with check (public.viterra_can_manage_inventory());

drop policy if exists developments_insert_authenticated on public.developments;
drop policy if exists developments_update_authenticated on public.developments;
drop policy if exists development_units_insert_authenticated on public.development_units;
drop policy if exists development_units_update_authenticated on public.development_units;
drop policy if exists development_units_delete_authenticated on public.development_units;

create policy developments_insert_inventory
  on public.developments
  for insert
  to authenticated
  with check (public.viterra_can_manage_inventory());

create policy developments_update_inventory
  on public.developments
  for update
  to authenticated
  using (public.viterra_can_manage_inventory())
  with check (public.viterra_can_manage_inventory());

create policy development_units_insert_inventory
  on public.development_units
  for insert
  to authenticated
  with check (public.viterra_can_manage_inventory());

create policy development_units_update_inventory
  on public.development_units
  for update
  to authenticated
  using (public.viterra_can_manage_inventory())
  with check (public.viterra_can_manage_inventory());

create policy development_units_delete_inventory
  on public.development_units
  for delete
  to authenticated
  using (public.viterra_can_manage_inventory());

-- ---------------------------------------------------------------------------
-- tokko_users
-- ---------------------------------------------------------------------------
drop policy if exists tokko_users_select_public on public.tokko_users;

create policy tokko_users_select_scoped
  on public.tokko_users
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.viterra_is_admin()
    or public.viterra_has_permission('manage_users')
    or public.viterra_has_permission('manage_leads')
  );

drop policy if exists tokko_users_update_admin on public.tokko_users;
create policy tokko_users_update_admin
  on public.tokko_users
  for update
  to authenticated
  using (public.viterra_is_admin() or public.viterra_has_permission('manage_users'))
  with check (public.viterra_is_admin() or public.viterra_has_permission('manage_users'));

drop policy if exists tokko_users_delete_admin on public.tokko_users;
create policy tokko_users_delete_admin
  on public.tokko_users
  for delete
  to authenticated
  using (public.viterra_is_admin());

revoke select on public.tokko_users from anon;
grant update, delete on public.tokko_users to authenticated;

-- ---------------------------------------------------------------------------
-- sales_pipeline_configs
-- ---------------------------------------------------------------------------
drop policy if exists sales_pipeline_configs_all_authenticated on public.sales_pipeline_configs;

create policy sales_pipeline_configs_select_authenticated
  on public.sales_pipeline_configs
  for select
  to authenticated
  using (true);

create policy sales_pipeline_configs_insert_scoped
  on public.sales_pipeline_configs
  for insert
  to authenticated
  with check (public.viterra_can_edit_pipeline(group_id));

create policy sales_pipeline_configs_update_scoped
  on public.sales_pipeline_configs
  for update
  to authenticated
  using (public.viterra_can_edit_pipeline(group_id))
  with check (public.viterra_can_edit_pipeline(group_id));

create policy sales_pipeline_configs_delete_admin
  on public.sales_pipeline_configs
  for delete
  to authenticated
  using (public.viterra_is_admin());

-- ---------------------------------------------------------------------------
-- kpi_targets / kpi_monthly_snapshots (lectura acotada)
-- ---------------------------------------------------------------------------
drop policy if exists kpi_targets_select_authenticated on public.kpi_targets;
drop policy if exists kpi_monthly_snapshots_select_authenticated on public.kpi_monthly_snapshots;

create policy kpi_targets_select_scoped
  on public.kpi_targets
  for select
  to authenticated
  using (public.viterra_can_read_kpi_scope(scope, scope_id));

create policy kpi_monthly_snapshots_select_scoped
  on public.kpi_monthly_snapshots
  for select
  to authenticated
  using (public.viterra_can_read_kpi_scope(scope, scope_id));
