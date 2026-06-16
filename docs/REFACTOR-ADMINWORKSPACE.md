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
| Tras Fase 2.4 | **5.458** | **34** | **20** | 43 | 39 |

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

## Pendiente ⏳ (continuar mañana)

### Fase 2 — núcleo de datos (ALTO cuidado)
- [ ] `useLeadsFilters` — estado UI de leads (`leadSearchNameScope`, `statusFilter`, `createdRangeFilter`, `createdFrom/To`, `leadsView`, `leadsTableSectionCollapsed`). **Bajo riesgo** (UI). Buen primer paso mañana.
- [ ] `useLeadsData` — **ALTO riesgo**: el efecto de fetch combinado con reintentos, refetch al cambiar de vista (vía `adminViewAsRef`), filtrado por `effectiveUser`, error/loading. Es el código tipo closures+refs+timing donde vivió el bug del rol.
- [ ] `usePipelineConfig` — **ALTO riesgo**: `pipelineByGroup`, `activePipelineGroupId`, hidratación, CRUD de etapas, copia, reglas de auto-move, `visiblePipelineGroupIds` (acoplado a permisos).
- [ ] `useDevelopmentsData` — `developments` + `developmentsLoading` + recarga.

### Fase 3 — pestañas → componentes
- [ ] Cada bloque `{activeTab === "x" && (...)}` a su propio componente (dashboard, leads, propiedades, consultas, clientes, agenda, actividades, empresa, perfil). Es lo que más reduce líneas.

### Fase 4 — red de seguridad ampliada
- [ ] Smoke-tests por pestaña (que cada módulo monte y haga su acción principal). Idealmente **antes** de tocar `useLeadsData`/`usePipelineConfig`.

### Fase 5 — limpieza y medición final
- [ ] Quitar imports/constantes huérfanas, medir líneas/hooks/tamaño de chunk.

## Reglas de oro para retomar
1. Una pieza a la vez → `tsc --noEmit` + `vite build` + `vitest run` → commit atómico.
2. **No** tocar `useLeadsData`/`usePipelineConfig` sin tests de respaldo (Fase 4 primero).
3. Mantener identidad/semántica de los valores (deps de memos/effects) para no romper closures.
4. `strictNullChecks` ya está activo: aprovecharlo como ayuda del compilador.
5. Trabajar en `cris`, mergear a `main` cuando el checkpoint esté estable.

Relacionado: [[auditoria-produccion-2026-06]], [[bug-rol-admin-degradado]].
