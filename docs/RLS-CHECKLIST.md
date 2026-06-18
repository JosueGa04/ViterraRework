# Checklist de seguridad RLS — Viterra

> El cliente expone el `anon key` (por diseño). **La única barrera real es RLS en Postgres.**
> Cualquier usuario autenticado puede abrir la consola del navegador y llamar a Supabase
> directamente con cualquier `insert/update/delete`. Verifica que **cada tabla** tenga RLS
> habilitado y policies que limiten **qué filas** puede leer/escribir cada rol.

Genera el estado actual con:

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relkind = 'r' and relnamespace = 'public'::regnamespace
order by relname;
-- relrowsecurity = true en TODAS las tablas de abajo.
```

## Tablas con ESCRITURA desde el cliente (prioridad alta)

| Tabla | Operaciones del cliente | Policy mínima esperada |
|---|---|---|
| `leads` | `select`, `insert`, `update` | **Crítico:** un `asesor` solo debe poder `UPDATE` leads asignados a él (`assigned_to_user_id`) o de su grupo. Hoy `updateLead`/`updateLeadOrder` escriben la **fila completa incluido `payload` JSON arbitrario** → la policy `UPDATE` debe acotar `USING` y `WITH CHECK` por propiedad/rol. Admin: todo. |
| `properties` | `select`, `insert`, `update` | Solo `admin` / rol con permiso de inventario puede `INSERT/UPDATE`. Lectura pública/catalogo según corresponda. |
| `developments`, `development_units` | `select`, `insert`, `update`, `delete` | Igual que `properties`. `DELETE` solo admin/inventario. |
| `tokko_users` | `select`, `update`, `delete` | **Crítico:** solo `admin` `UPDATE/DELETE`. Verifica que un usuario no pueda elevar su propio `role` ni el `tokko_user_id` (impersonación de leads). Campos de password gestionados solo por RPC. |
| `user_groups`, `user_group_members` | `upsert`, `insert`, `update`, `delete` | Solo `admin` (y `lider_grupo` para su grupo si aplica). |
| `kpi_targets` | `upsert`, `delete` | Solo `admin` / `lider_grupo` dentro de su alcance. |
| `sales_pipeline_configs` | `upsert` | Solo `admin` / `lider_grupo` de ese grupo. |
| `site_content_sections` | `upsert` | Solo `admin` / rol con permiso de edición de sitio. Lectura pública OK. |
| `direct_messages` | `insert`, `delete` | Solo `INSERT` con `sender = auth.uid()`; `DELETE`/`select` solo de conversaciones donde el usuario participa. |
| `catalog_activities` | `insert`, `select` | `INSERT` ligado al actor autenticado. |
| `kpi_monthly_snapshots` | (vía RPC) | Escritura solo por la RPC `recompute_kpi_monthly_snapshots` (SECURITY DEFINER). |

## Tablas de solo lectura desde el cliente

`tokko_property_types`, `tokko_property_tags`, `tokko_development_types` → `SELECT`.
Confirmar que no haya policies de escritura abiertas.

## RPC (SECURITY DEFINER — validar internamente, no confiar en el input)

| RPC | Rol | Verificar |
|---|---|---|
| `submit_catalog_lead` | `anon` | ✅ Ya valida nombre/email/teléfono/mensaje server-side. Confirmar rate-limiting. |
| `complete_tokko_initial_password` | `authenticated` | Que solo permita cambiar la propia password en primer login; no la de otros. |
| `recompute_kpi_monthly_snapshots` | `admin`/`lider` | Que valide el rol del invocador antes de recomputar. |

## Pruebas de penetración rápidas (consola del navegador, logueado como `asesor`)

En desarrollo, el cliente está en `window.__supabase` tras cargar la app.

Automatizado (requiere credenciales de un usuario **asesor** — no admin — en `.env`):

```bash
npm run test:rls:script
```

Si el script aborta con "Este usuario es admin", crea o usa una cuenta con `role = 'asesor'` en `tokko_users`.

Manual en consola:

```js
const c = window.__supabase ?? supabase;
// 1) ¿Puede un asesor reescribir un lead que NO es suyo? → debe FALLAR (403/0 filas)
await c.from('leads').update({ priority_stars: 6 }).eq('id', '<lead_de_otro>');
// 2) ¿Puede elevar su propio rol? → debe FALLAR
await c.from('tokko_users').update({ role: 'admin' }).eq('id', '<su_uid>');
// 3) ¿Puede leer mensajes de otros? → debe devolver 0 filas
await c.from('direct_messages').select('*').limit(5);
// 4) ¿Puede borrar un grupo? → debe FALLAR
await c.from('user_groups').delete().eq('id', '<algún_grupo>');
```

Si **cualquiera** de esas devuelve éxito/filas, hay un hueco de RLS que corregir antes de producción.

## Notas

- `relforcerowsecurity` conviene `true` para que ni el `owner` salte RLS por error.
- Revisa que no existan policies `USING (true)` para `authenticated` en tablas de escritura.
- El `anon key` en `.env` (`VITE_SUPABASE_ANON_KEY`) es público por diseño — no es el problema; el problema sería un `service_role` en el cliente (verificado: **no existe** en el código).
