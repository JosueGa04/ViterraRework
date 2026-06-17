# Descomposición de `AdminWorkspace.tsx` — progreso y plan

> Refactor incremental del "god component" del panel admin. Cada paso: `tsc` 0 errores,
> `vite build` ok, suite de tests en verde, y **commit atómico revertible**. Rama de trabajo: `cris`.

## Por qué
`AdminWorkspace.tsx` era un componente de ~5.760 líneas con ~164 hooks, estados de 8+ dominios
mezclados, ~401 props repartidas y **0 tests**. Difícil de mantener, propenso a re-renders en
cascada y a bugs de closures/timing (ahí vivía el bug del rol admin). Objetivo: convertirlo en
muchas piezas pequeñas, cohesivas y testeables, **sin cambiar comportamiento**.

## Métricas (progresión)
| Momento | Líneas | useState | useEffect | useMemo | useCallback |
|---|---|---|---|---|---|
| Inicio | 5.735 | 50 | 23 | 44 | 39 |
| Tras Fase 2.5 | 5.465 | 26 | 20 | 43 | 39 |
| Tras 2.6 (filtrado leads) | 5.428 | 26 | 20 | 43 | 39 |
| Tras 2.7 (filtrado props) | 5.399 | 26 | 20 | 43 | 39 |
| Tras 2.8 (agrupación leads) | 5.387 | 26 | 20 | 43 | 39 |
| Tras 2.9 (selección por grupo) | 5.393 | 26 | 20 | 43 | 39 |
| Tras 2.10 (useLeadsData) | 5.360 | 26 | 19 | 42 | 38 |
| Tras 3.1 (AdminDashboardContent) | 5.337 | 25 | 19 | 42 | 38 |
| Tras 2.11 (pipelineSelection) | 5.333 | 25 | 19 | 41 | 38 |
| Tras 2.12 (usePipelineConfig) | 5.310 | 22 | 19 | 38 | 38 |
| Tras 3.2 (PropertyStatsCards) | 5.268 | 22 | 19 | 38 | 38 |
| Tras 3.3 (PropertiesToolbar) | 5.076 | 22 | 19 | 38 | 38 |
| Tras 3.4 (PropertiesViews) | 4.746 | 22 | 19 | 38 | 38 |
| Tras 3.5 (LeadsTable) | 4.546 | 22 | 19 | 38 | 38 |
| Tras 3.6 (LeadsToolbar) | 4.381 | 22 | 19 | 38 | 38 |
| Tras 3.7 (PipelineStagesPanel) | 3.915 | 22 | 19 | 38 | 38 |
| Tras 3.8 (CompanyContent) | **3.859** | 22 | 19 | 38 | 38 |

(El conteo de líneas baja poco en los hooks de puro `useState` por lo verboso del destructure;
el valor real es la reducción de estado/efectos que el componente maneja directamente y la
testeabilidad.)

## Hecho ✅

### Fase 1 — extracciones de riesgo ~0
- **1a** `adminWorkspaceHelpers.ts` — 4 helpers puros + **7 tests unitarios** (red de seguridad). _(f7c7aee)_
- **1b** `AutoMoveRulesPanel.tsx` — sub-componente (~190 líneas) movido a archivo propio. _(f7c7aee)_

### Fase 2 — hooks de dominio (parte de bajo riesgo)
- **2.1** `useAdminSidebar.ts` — sidebar escritorio + drawer móvil (persistencia, Escape, scroll-lock). _(62f47ec)_
- **2.2** `useAdminViewAs.ts` — vista por rol: `adminViewAs`, `effectiveUser`, `effectiveRole`, `isAdmin/isGroupLeader/isAdvisor`. _(ac1da8a)_
- **2.3** `useAdminAppointments.ts` — agenda local (hidratación localStorage para métricas de KPI's). _(9eb9fa7)_
- **2.4** `usePropertiesFilters.ts` — 8 estados de búsqueda/filtros/vista del catálogo (solo UI). _(19cf59b)_
- **2.5** `useLeadsFilters.ts` — 8 estados de búsqueda/filtros/vista de leads (solo UI). useState 34 → 26.
- **2.6** `leadsFiltering.ts` — `filterLeadsForDisplay` (búsqueda por scope + estado + rango de fecha) extraído como función pura + **8 tests**. De-riesga el futuro `useLeadsData` aislando su lógica más propensa a bugs.
- **2.7** `propertiesFiltering.ts` — `filterPropertiesForDisplay` (búsqueda, código ref, operación, tipo, ubicación, destacado) puro + **6 tests**. De-riesga la pestaña/datos de Propiedades.
- **2.8** `leadsGrouping.ts` — `computeLeadStatusesForRendering` + `groupLeadsByStatus` puros + **5 tests**.
- **2.9** `filterLeadsByActiveGroup` (selección por grupo de pipeline, semántica "General = todos los permitidos") + **2 tests**. **100 tests** acumulados.
- **2.10** `useLeadsData.ts` — estado de leads (`leads`/`leadsLoading`/`leadsError`) + `leadsForUser` + `reloadLeads` + refetch al cambiar de vista. Extracción dueña-de-estado: devuelve los setters; el efecto de carga combinado y los handlers CRUD se quedan en AdminWorkspace. Semánticamente idéntico (mismo código/deps). **Falta verificación runtime (Fase 4).**

> **Nota sobre la capa de datos:** `leads`, `developments`, grupos y pipeline se cargan en **un solo efecto de fetch combinado** (`Promise.all([leadsP, devP, bootstrapP])`, ~líneas 660-755). Por eso `useLeadsData`/`useDevelopmentsData`/`usePipelineConfig` NO son separables sin refactorizar ese efecto → siguen siendo ALTO riesgo y requieren la red de tests primero. Estrategia: seguir extrayendo la **lógica pura** (filtrado/orden/agrupación) con tests antes de tocar el efecto.

## Pendiente ⏳ (continuar mañana)

### Fase 2 — núcleo de datos (ALTO cuidado)
- [x] `usePipelineConfig` (2.11 de-riesgo + 2.12 hook). `usePipelineConfig.ts` posee el estado (pipelineByGroup/pipelineSourcesHydrated/activePipelineGroupId) + derivaciones (allowed/visiblePipelineGroupIds, activePipeline, customKanbanStages/stageOrder/stageColors, canConfigureActivePipeline). **Decisión:** los EFECTOS de sync/persist/reset/snapshot-ensure y los handlers de CRUD de etapas se quedaron en AdminWorkspace en su posición original (preservan el orden relativo al fetch combinado → cero riesgo de timing). Falta verificación runtime (Fase 4).
- [ ] `useDevelopmentsData` — `developments` + `developmentsLoading` + recarga.

### Fase 3 — pestañas → componentes
- [x] **3.1** Dashboard → `components/admin/AdminDashboardContent.tsx` (patrón establecido).
- [~] Propiedades (en piezas): **3.2** `AdminPropertyStatsCards.tsx` (stats). **3.3** `AdminPropertiesToolbar.tsx` (header+toggle vista+Nueva+búsqueda+filtros, −192 líneas; recibe el objeto `usePropertiesFilters()` como un prop `filters`). **3.4** `AdminPropertiesViews.tsx` (mapa/tarjetas/lista/vacío, −330 líneas; PropertyMap y PdfDownloadDropdown lazy dentro). **Pestaña Propiedades COMPLETA.**
- [~] Leads (en piezas): **3.5** `AdminLeadsTable.tsx` (vista tabla por estado con acciones por lead, −200 líneas). **3.6** `AdminLeadsToolbar.tsx` (header+toggle+Nuevo+búsqueda+filtros+selector de grupo, −161 líneas). **Pestaña Leads COMPLETA** (kanban y AddLeadDialog ya eran componentes).
- [x] Empresa (en piezas): **3.7** `AdminPipelineStagesPanel.tsx` (subtab leadStages: selección de grupo, duplicado de pipeline, grupos del líder, CRUD/orden/color de columnas con DnD, AutoMoveRulesPanel; −464 líneas). **3.8** `AdminCompanyContent.tsx` (contenedor: cabecera + selector de subtab + estructura "siempre montado"; los paneles pesados —users/settings/pipeline— se inyectan como **slots ReactNode** ya cableados en AdminWorkspace para no re-cablear ~30 props; editor de sitio lazy dentro; −56 líneas). **Pestaña Empresa COMPLETA.**
- [x] Pestañas "gordas" componetizadas: **Propiedades**, **Leads**, **Empresa**.
- [x] Pestañas delgadas restantes (consultas, clientes, agenda, actividades, perfil, kpis, sitio, developments): **verificadas — cada una ya delega en un único módulo dedicado** (AdminConsultasModule, AdminClientsManager, AdminAgendaModule, AdminActivitiesModule, AdminUsersManager/AdminUserProfilePanel, KPIsModule, AdminSiteEditor, AdminDevelopmentsManager). No queda lógica inline que extraer; envolverlas sería pura indirección. **Fase 3 COMPLETA.**

### Fase 4 — red de seguridad ampliada (EN CURSO)
Smoke/integration-tests con Testing Library (jsdom). Empezando por el área de mayor riesgo
(closures/timing del CRUD de pipeline) y siguiendo por las pestañas componetizadas.
- [x] `AdminPipelineStagesPanel` (+7) — monta filas por columna; cada acción (cambiar grupo, agregar/editar/eliminar columna, color, gating por permiso) dispara su handler.
- [x] `AdminCompanyContent` (+6) — skeleton de carga, cabecera por rol, selector de subtab (goTab), 3 paneles montados SIEMPRE (hidden-CSS).
- [x] `AdminLeadsTable` (+7) — vacío, secciones, colapsar, cambio de estado, ver/editar, eliminar con confirmación.
- [x] `AdminLeadsToolbar` (+6) — toggle vista, Nuevo Lead, búsqueda, selector de grupo, rango personalizado.
- [x] `AdminPropertyStatsCards` (+2) — métricas y formato de moneda.
- [x] `AdminDashboardContent` (+3) — routing de skeleton por rol en carga.
- [ ] Pendiente: `AdminPropertiesToolbar` / `AdminPropertiesViews` (fixtures de `Property`); **verificación runtime en el navegador** de `useLeadsData` + `usePipelineConfig` + CRUD de pipeline (lo que un test de jsdom no cubre: persistencia, fetch combinado, timing real).
- Conteo: **106 → 137 tests** (10 → 16 archivos).

### Fase 5 — limpieza y medición final
- [ ] Quitar imports/constantes huérfanas, medir líneas/hooks/tamaño de chunk.

## Reglas de oro para retomar
1. Una pieza a la vez → `tsc --noEmit` + `vite build` + `vitest run` → commit atómico.
2. **No** tocar `useLeadsData`/`usePipelineConfig` sin tests de respaldo (Fase 4 primero).
3. Mantener identidad/semántica de los valores (deps de memos/effects) para no romper closures.
4. `strictNullChecks` ya está activo: aprovecharlo como ayuda del compilador.
5. Trabajar en `cris`, mergear a `main` cuando el checkpoint esté estable.

Relacionado: [[auditoria-produccion-2026-06]], [[bug-rol-admin-degradado]].
