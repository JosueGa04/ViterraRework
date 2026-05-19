-- DM interno (chat) entre usuarios CRM. RLS: solo emisor o receptor pueden leer;
-- el emisor inserta; el receptor marca `read_at`; el emisor puede borrar lo suyo.

create extension if not exists "pgcrypto";

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.tokko_users(id) on delete cascade,
  recipient_id uuid not null references public.tokko_users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint dm_not_self check (sender_id <> recipient_id)
);

-- Lookup eficiente de la conversación A↔B sin importar quién envió primero.
create index if not exists dm_pair_created_idx on public.direct_messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

-- Conteo rápido de no-leídos por destinatario.
create index if not exists dm_recipient_unread_idx on public.direct_messages (recipient_id)
  where read_at is null;

-- Para la lista de conversaciones (último mensaje por contacto).
create index if not exists dm_recipient_created_idx on public.direct_messages (recipient_id, created_at desc);
create index if not exists dm_sender_created_idx on public.direct_messages (sender_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));

drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id);

drop policy if exists dm_update_read on public.direct_messages;
create policy dm_update_read on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists dm_delete_own on public.direct_messages;
create policy dm_delete_own on public.direct_messages for delete to authenticated
  using (auth.uid() = sender_id);

grant select, insert, update, delete on public.direct_messages to authenticated;

-- Realtime: emitir INSERT/UPDATE/DELETE en supabase_realtime publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.direct_messages';
  end if;
end $$;
