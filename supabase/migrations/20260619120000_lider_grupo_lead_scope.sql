-- Acota leads de lider_grupo a miembros de sus grupos (no todos los leads del CRM).

create or replace function public.viterra_is_leader_for_assigned_user(p_assigned_uid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_groups g
    join public.user_group_members m on m.group_id = g.id
    where g.deleted_at is null
      and g.leader_id = auth.uid()
      and (
        m.user_id::text = nullif(trim(coalesce(p_assigned_uid, '')), '')
        or m.user_id::text = auth.uid()::text
      )
  );
$$;

revoke all on function public.viterra_is_leader_for_assigned_user(text) from public;
grant execute on function public.viterra_is_leader_for_assigned_user(text) to authenticated;

create or replace function public.viterra_can_access_lead(p_assigned_uid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.viterra_is_admin()
    or public.viterra_lead_assigned_to_me(p_assigned_uid)
    or (
      public.viterra_current_role() = 'lider_grupo'
      and public.viterra_is_leader_for_assigned_user(p_assigned_uid)
    );
$$;

-- Líder puede gestionar miembros de sus grupos (no crear/borrar grupos enteros).
drop policy if exists user_group_members_write_admin on public.user_group_members;
drop policy if exists user_group_members_select_scoped on public.user_group_members;

create policy user_group_members_select_scoped
  on public.user_group_members
  for select
  to authenticated
  using (
    public.viterra_is_admin()
    or public.viterra_has_permission('manage_users')
    or exists (
      select 1
      from public.user_groups g
      where g.id = user_group_members.group_id
        and g.deleted_at is null
        and (
          g.leader_id = auth.uid()
          or exists (
            select 1
            from public.user_group_members m2
            where m2.group_id = g.id
              and m2.user_id = auth.uid()
          )
        )
    )
  );

create policy user_group_members_write_admin
  on public.user_group_members
  for all
  to authenticated
  using (
    public.viterra_is_admin()
    or public.viterra_has_permission('manage_users')
    or exists (
      select 1
      from public.user_groups g
      where g.id = user_group_members.group_id
        and g.deleted_at is null
        and g.leader_id = auth.uid()
    )
  )
  with check (
    public.viterra_is_admin()
    or public.viterra_has_permission('manage_users')
    or exists (
      select 1
      from public.user_groups g
      where g.id = user_group_members.group_id
        and g.deleted_at is null
        and g.leader_id = auth.uid()
    )
  );
