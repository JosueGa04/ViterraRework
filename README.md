# ViterraRework

Sitio web y panel CRM de Viterra Inmobiliaria.

## Requisitos

- Node.js >= 18
- Proyecto Supabase configurado

## Configuración local

1. Copia `.env.example` a `.env` y completa las variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

2. Instala dependencias y arranca el servidor de desarrollo:

```bash
npm install
npm run dev
```

## Supabase

### Migraciones

Aplica las migraciones en orden:

```bash
supabase db push
```

Incluye endurecimiento RLS (`20260618*`) y fase 2 (`20260619120000` alcance líderes, `20260619130000` FORCE RLS).

O ejecuta el SQL de `supabase/migrations/` en el SQL Editor del dashboard.

### Edge Functions

Despliega las funciones administrativas:

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-update-password
supabase functions deploy tokko-sync
supabase functions deploy instagram-feed
```

### Checklist pre-producción

Antes de publicar, revisa [docs/RLS-CHECKLIST.md](docs/RLS-CHECKLIST.md) y verifica:

- RLS habilitado en todas las tablas con escritura desde el cliente
- Un asesor **no** puede modificar leads ajenos vía consola del navegador
- Variables `VITE_*` configuradas en Vercel (o tu hosting)
- Edge Functions desplegadas con secrets (`SUPABASE_SERVICE_ROLE_KEY`, etc.)

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción |
| `npm run typecheck` | Verificación TypeScript |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:rls` | Pruebas RLS live (requiere `TEST_ASESOR_*` en `.env`) |
| `npm run smoke` | Smoke test de rutas públicas (requiere `npm run dev`) |
| `npm run test:e2e` | Tests E2E (Playwright) |

## Seguridad

- La `anon key` es pública por diseño en SPAs; la barrera real es **RLS en Postgres**.
- No expongas `service_role` en el cliente.
- Formularios públicos usan RPC `submit_catalog_lead` con rate limiting.
