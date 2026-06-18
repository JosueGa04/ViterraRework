-- Equipos CRM (grupos de asesores). Referenciado por KPIs, pipeline y asignación de leads.

create table if not exists public.user_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  leader_id uuid not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_group_members (
  group_id uuid not null references public.user_groups (id) on delete cascade,
  user_id uuid not null,
  primary key (group_id, user_id)
);

create index if not exists user_groups_leader_id_idx on public.user_groups (leader_id);
create index if not exists user_group_members_user_id_idx on public.user_group_members (user_id);

alter table public.user_groups enable row level security;
alter table public.user_group_members enable row level security;

-- Helpers (reused by RLS hardening migration).
create or replace function public.viterra_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tu.role
  from public.tokko_users tu
  where tu.id = auth.uid()
    and tu.deleted_at is null
  limit 1;
$$;

create or replace function public.viterra_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.viterra_current_role(), '') = 'admin';
$$;

create or replace function public.viterra_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.viterra_current_role(), '') in ('admin', 'lider_grupo');
$$;

create or replace function public.viterra_has_permission(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tokko_users tu
    where tu.id = auth.uid()
      and tu.deleted_at is null
      and (
        tu.role = 'admin'
        or p_perm = any (coalesce(tu.permissions, '{}'::text[]))
      )
  );
$$;

revoke all on function public.viterra_current_role() from public;
revoke all on function public.viterra_is_admin() from public;
revoke all on function public.viterra_is_leader() from public;
revoke all on function public.viterra_has_permission(text) from public;
grant execute on function public.viterra_current_role() to authenticated;
grant execute on function public.viterra_is_admin() to authenticated;
grant execute on function public.viterra_is_leader() to authenticated;
grant execute on function public.viterra_has_permission(text) to authenticated;

drop policy if exists user_groups_select_scoped on public.user_groups;
create policy user_groups_select_scoped
  on public.user_groups
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      public.viterra_is_admin()
      or public.viterra_has_permission('manage_users')
      or leader_id = auth.uid()
      or exists (
        select 1
        from public.user_group_members m
        where m.group_id = user_groups.id
          and m.user_id = auth.uid()
      )
    )
  );

drop policy if exists user_groups_write_admin on public.user_groups;
create policy user_groups_write_admin
  on public.user_groups
  for all
  to authenticated
  using (public.viterra_is_admin() or public.viterra_has_permission('manage_users'))
  with check (public.viterra_is_admin() or public.viterra_has_permission('manage_users'));

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

drop policy if exists user_group_members_write_admin on public.user_group_members;
create policy user_group_members_write_admin
  on public.user_group_members
  for all
  to authenticated
  using (public.viterra_is_admin() or public.viterra_has_permission('manage_users'))
  with check (public.viterra_is_admin() or public.viterra_has_permission('manage_users'));

grant select on public.user_groups to authenticated;
grant select on public.user_group_members to authenticated;
grant insert, update, delete on public.user_groups to authenticated;
grant insert, update, delete on public.user_group_members to authenticated;
