# Fijar `role` en el JWT (app_metadata) — fix durable del rol

**Problema que resuelve:** el cliente cae a rol `asesor` cuando el JWT no trae `role`.
Si `app_metadata.role` está poblado, el token lo firma y el cliente ya no depende de
leer `tokko_users` (ni de la cache local). Ver [bug-rol-admin-degradado] / `AuthContext.tsx`.

> Ejecutar en **Supabase → SQL Editor** (corre con privilegios que pueden tocar `auth.users`).
> El cliente lee el rol con `app_metadata.role ?? user_metadata.role` (`roleStringFromAuthUser`).

## 1) Backfill (una vez) — sincroniza desde `tokko_users.role`

```sql
update auth.users u
set raw_app_meta_data =
      coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', t.role)
from public.tokko_users t
where t.id = u.id
  and t.role is not null
  and t.role <> ''
  and (u.raw_app_meta_data ->> 'role') is distinct from t.role;
```

Idempotente: solo actualiza filas cuyo `role` difiere. Vuelve a correrlo cuando quieras.

## 2) Verificar

```sql
select u.email,
       u.raw_app_meta_data ->> 'role' as jwt_role,
       t.role                          as db_role
from auth.users u
left join public.tokko_users t on t.id = u.id
order by u.email;
-- jwt_role debe coincidir con db_role para todos (especialmente los admin/líder).
```

## 3) (Opcional) Mantenerlo en sync automáticamente

Trigger que actualiza el JWT-role cada vez que cambia `tokko_users.role`:

```sql
create or replace function public.sync_role_to_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.role is distinct from old.role then
    update auth.users
    set raw_app_meta_data =
          coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_role_to_auth on public.tokko_users;
create trigger trg_sync_role_to_auth
after update of role on public.tokko_users
for each row execute function public.sync_role_to_auth_metadata();
```

> Requiere que el owner de la función tenga permiso de `update` sobre `auth.users`
> (lo tiene el rol con que corre el SQL Editor). Revisa que encaje con tu setup.

## 4) Importante: refrescar el token

Los cambios en `app_metadata` **no aparecen en sesiones ya emitidas** hasta que el
usuario obtiene un token nuevo. Para que tome efecto:

- El usuario **cierra y vuelve a iniciar sesión**, o
- Espera al próximo `TOKEN_REFRESHED` (auto-refresh), o
- Forzarlo desde el cliente: `await supabase.auth.refreshSession()`.

## Alternativa: Admin API (script server-side con `service_role`)

```ts
// NO en el cliente. Solo en un entorno con SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
const admin = createClient(URL, SERVICE_ROLE_KEY);
await admin.auth.admin.updateUserById(userId, { app_metadata: { role: "admin" } });
```
