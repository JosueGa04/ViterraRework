import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, Copy, Edit, GripVertical, LayoutGrid, Plus, Trash2, Users } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { User } from "../../contexts/AuthContext";
import { normalizeLeadPipelineStatus, type Lead } from "../../data/leads";
import {
  createEmptyGroupPipelineSnapshot,
  type GroupPipelineSnapshot,
} from "../../lib/pipelineByGroup";
import type { UserGroup } from "../../lib/userGroups";
import { cn } from "../ui/utils";
import { AutoMoveRulesPanel } from "./AutoMoveRulesPanel";
import { PipelineStageReorderRow } from "./PipelineStageReorderRow";

type Props = {
  isAdmin: boolean;
  isGroupLeader: boolean;
  activePipelineGroupId: string;
  setActivePipelineGroupId: Dispatch<SetStateAction<string>>;
  allowedPipelineGroupIds: string[];
  pipelineGroupLabel: (groupId: string) => string;
  pipelineCopyDestOptions: string[];
  pipelineCopyFrom: string;
  setPipelineCopyFrom: Dispatch<SetStateAction<string>>;
  pipelineCopySourceOptions: string[];
  pipelineCopyTo: string;
  setPipelineCopyTo: Dispatch<SetStateAction<string>>;
  handleDuplicatePipelineToTeam: () => void;
  canSubmitPipelineCopy: boolean;
  pipelineGroupsVisibleToLeader: UserGroup[];
  advisorsByGroupId: Record<string, User[]>;
  expandedLeaderGroupId: string | null;
  setExpandedLeaderGroupId: Dispatch<SetStateAction<string | null>>;
  handleViewTeamMember: (userId: string, fallbackName?: string) => void;
  stageDraftLabel: string;
  setStageDraftLabel: Dispatch<SetStateAction<string>>;
  handleAddKanbanStage: (label: string) => void;
  canConfigureActivePipeline: boolean;
  leadColumnStatuses: string[];
  resolveStatusLabel: (s: string) => string;
  editingStageId: string | null;
  setEditingStageId: Dispatch<SetStateAction<string | null>>;
  leads: Lead[];
  handleReorderPipelineRows: (dragIndex: number, hoverIndex: number) => void;
  resolveStageHex: (stageId: string) => string;
  setPipelineByGroup: Dispatch<SetStateAction<Record<string, GroupPipelineSnapshot>>>;
  handleUpdateKanbanStage: (stageId: string, label: string) => void;
  requestDeletePipelineStage: (stageId: string, label: string) => void;
  pipelineByGroup: Record<string, GroupPipelineSnapshot>;
};

/**
 * Panel del subtab "Pipeline de ventas" (leadStages) de la pestaña Empresa: selección de grupo,
 * duplicado de pipeline entre equipos, grupos del líder, alta/orden/color/edición/borrado de
 * columnas (DnD) y reglas de auto-movimiento. El estado y los handlers viven en AdminWorkspace.
 */
export function AdminPipelineStagesPanel({
  isAdmin,
  isGroupLeader,
  activePipelineGroupId,
  setActivePipelineGroupId,
  allowedPipelineGroupIds,
  pipelineGroupLabel,
  pipelineCopyDestOptions,
  pipelineCopyFrom,
  setPipelineCopyFrom,
  pipelineCopySourceOptions,
  pipelineCopyTo,
  setPipelineCopyTo,
  handleDuplicatePipelineToTeam,
  canSubmitPipelineCopy,
  pipelineGroupsVisibleToLeader,
  advisorsByGroupId,
  expandedLeaderGroupId,
  setExpandedLeaderGroupId,
  handleViewTeamMember,
  stageDraftLabel,
  setStageDraftLabel,
  handleAddKanbanStage,
  canConfigureActivePipeline,
  leadColumnStatuses,
  resolveStatusLabel,
  editingStageId,
  setEditingStageId,
  leads,
  handleReorderPipelineRows,
  resolveStageHex,
  setPipelineByGroup,
  handleUpdateKanbanStage,
  requestDeletePipelineStage,
  pipelineByGroup,
}: Props) {
  return (
                  <div className="flex flex-col gap-6 p-5 md:p-8">
                    {isAdmin && (
                      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-12px_rgba(20,28,46,0.12)] ring-1 ring-black/[0.03]">
                        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4 md:px-6">
                          <h4
                            className="flex items-center gap-2 text-base text-brand-navy"
                            style={{ fontWeight: 700 }}
                          >
                            <LayoutGrid className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                            Organización del pipeline por equipo
                          </h4>
                          <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
                            Selecciona el grupo cuyo embudo quieres revisar o editar. Los cambios se guardan para ese
                            equipo y se reflejan en el CRM cuando ese grupo está activo en la vista de leads.
                          </p>
                        </div>
                        <div className="p-5 md:px-6 md:pb-6">
                          <label
                            htmlFor="admin-pipeline-group-context"
                            className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                          >
                            Equipo / contexto del embudo
                          </label>
                          <div className="relative min-h-[2.75rem]">
                            <Users
                              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                              strokeWidth={1.75}
                            />
                            <select
                              id="admin-pipeline-group-context"
                              value={activePipelineGroupId}
                              onChange={(e) => setActivePipelineGroupId(e.target.value)}
                              className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                              style={{ fontWeight: 500 }}
                            >
                              {allowedPipelineGroupIds.map((id) => (
                                <option key={id} value={id}>
                                  Grupo: {pipelineGroupLabel(id)}
                                </option>
                              ))}
                            </select>
                            <span
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                              aria-hidden
                            >
                              <ChevronDown className="h-4 w-4" strokeWidth={2} />
                            </span>
                          </div>
                        </div>
                      </section>
                    )}

                    {isAdmin && pipelineCopyDestOptions.length > 0 && (
                      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-12px_rgba(20,28,46,0.12)] ring-1 ring-black/[0.03]">
                        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4 md:px-6">
                          <h4
                            className="flex items-center gap-2 text-base text-brand-navy"
                            style={{ fontWeight: 700 }}
                          >
                            <Copy className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                            Duplicar pipeline entre equipos
                          </h4>
                          <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
                            Copia etapas, orden y colores de un embudo a otro. Reemplaza la configuración del pipeline del
                            equipo de destino; no mueve ni cambia los leads.
                          </p>
                        </div>
                        <div className="space-y-4 p-5 md:px-6 md:pb-6">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label
                                htmlFor="pipeline-copy-from"
                                className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                              >
                                Copiar pipeline desde
                              </label>
                              <div className="relative min-h-[2.75rem]">
                                <Copy
                                  className="pointer-events-none absolute left-4 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                                <select
                                  id="pipeline-copy-from"
                                  value={pipelineCopyFrom}
                                  onChange={(e) => setPipelineCopyFrom(e.target.value)}
                                  className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                  style={{ fontWeight: 500 }}
                                >
                                  <option value="">— Elige el equipo de origen —</option>
                                  {pipelineCopySourceOptions.map((id) => (
                                    <option key={id} value={id}>
                                      {pipelineGroupLabel(id)}
                                    </option>
                                  ))}
                                </select>
                                <span
                                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  aria-hidden
                                >
                                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label
                                htmlFor="pipeline-copy-to"
                                className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                              >
                                Aplicar en (destino)
                              </label>
                              <div className="relative min-h-[2.75rem]">
                                <Users
                                  className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                                  strokeWidth={1.75}
                                />
                                <select
                                  id="pipeline-copy-to"
                                  value={pipelineCopyTo}
                                  onChange={(e) => setPipelineCopyTo(e.target.value)}
                                  className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                  style={{ fontWeight: 500 }}
                                >
                                  <option value="">— Elige el equipo de destino —</option>
                                  {pipelineCopyDestOptions.map((id) => (
                                    <option key={id} value={id}>
                                      {pipelineGroupLabel(id)}
                                    </option>
                                  ))}
                                </select>
                                <span
                                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  aria-hidden
                                >
                                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                            <button
                              type="button"
                              onClick={handleDuplicatePipelineToTeam}
                              disabled={!canSubmitPipelineCopy}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ fontWeight: 600 }}
                            >
                              <Copy className="h-4 w-4" strokeWidth={2} />
                              Duplicar pipeline
                            </button>
                            {canSubmitPipelineCopy && (
                              <p className="text-xs text-slate-500 sm:pb-0.5" style={{ fontWeight: 500 }}>
                                Se reemplaza el embudo de «{pipelineGroupLabel(pipelineCopyTo)}».
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {isGroupLeader && (
                      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_50px_-24px_rgba(20,28,46,0.26)]">
                        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4">
                          <h4 className="flex items-center gap-2 text-base text-brand-navy" style={{ fontWeight: 700 }}>
                            <Users className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                            Tus grupos y asesores
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            Selecciona un asesor para abrir su detalle o cambia de grupo para configurar su pipeline.
                          </p>
                        </div>
                        {pipelineGroupsVisibleToLeader.length === 0 ? (
                          <div className="p-5">
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                              No tienes grupos asignados por ahora. Contacta a un administrador para vincular grupos.
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-3 p-5">
                            {pipelineGroupsVisibleToLeader.map((group) => {
                              const advisors = advisorsByGroupId[group.id] ?? [];
                              const isActiveGroup = activePipelineGroupId === group.id;
                              const isExpanded = expandedLeaderGroupId === group.id;
                              return (
                                <article
                                  key={group.id}
                                  className={cn(
                                    "rounded-xl border bg-white p-4 transition-shadow",
                                    isActiveGroup
                                      ? "border-primary/40 shadow-[0_14px_30px_-20px_rgba(199,34,56,0.7)] ring-1 ring-primary/20"
                                      : "border-slate-200/80 shadow-[0_8px_24px_-16px_rgba(20,28,46,0.2)]"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedLeaderGroupId((prev) => (prev === group.id ? null : group.id))
                                      }
                                      className="flex min-w-0 items-center gap-2 text-left"
                                    >
                                      <ChevronDown
                                        className={cn("h-4 w-4 text-slate-500 transition-transform", isExpanded && "rotate-180")}
                                        strokeWidth={1.9}
                                      />
                                      <p className="truncate text-lg text-brand-navy" style={{ fontWeight: 700 }}>
                                        {group.name}
                                      </p>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActivePipelineGroupId(group.id)}
                                      className={cn(
                                        "shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition",
                                        isActiveGroup
                                          ? "border-primary/35 bg-primary/10 text-primary"
                                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/25 hover:text-primary"
                                      )}
                                      style={{ fontWeight: 600 }}
                                    >
                                      {isActiveGroup ? "Grupo activo" : "Activar grupo"}
                                    </button>
                                  </div>

                                  {isExpanded ? (
                                    <div className="mt-3 border-t border-slate-200/80 pt-3">
                                      <p className="mb-2 text-xs text-slate-500" style={{ fontWeight: 600 }}>
                                        {advisors.length} asesor{advisors.length === 1 ? "" : "es"}
                                      </p>
                                      {advisors.length > 0 ? (
                                        <div className="space-y-2">
                                          {advisors.map((advisor) => (
                                            <button
                                              type="button"
                                              key={advisor.id}
                                              onClick={() => handleViewTeamMember(advisor.id, advisor.name)}
                                              className="flex w-full items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                            >
                                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-[11px] text-primary">
                                                {(advisor.name || advisor.email || "?").trim().charAt(0).toUpperCase()}
                                              </span>
                                              <span className="truncate" style={{ fontWeight: 600 }}>
                                                {advisor.name || advisor.email}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-500">Sin asesores activos en este grupo.</span>
                                      )}
                                    </div>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    )}

                    {!activePipelineGroupId ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                        No hay un grupo de trabajo asignado para configurar pipeline.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-primary" style={{ fontWeight: 600 }}>
                            Embudo comercial
                          </p>
                          <h3 className="mt-1 text-2xl text-brand-navy" style={{ fontWeight: 600 }}>
                            Pipeline de leads
                          </h3>
                          <p className="mt-2 text-sm text-slate-600" style={{ fontWeight: 500 }}>
                            Cada equipo tiene sus propias columnas. El administrador puede crearlas, ordenarlas y colorearlas
                            en cualquier grupo; el líder de grupo solo en los suyos. Los cambios aplican al tablero cuando
                            ese grupo está seleccionado en el CRM (o aquí arriba, si eres administrador).
                          </p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
                          <input
                            type="text"
                            value={stageDraftLabel}
                            onChange={(e) => setStageDraftLabel(e.target.value)}
                            placeholder="Nueva columna del pipeline"
                            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-brand-navy placeholder:text-slate-400 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
                            disabled={!canConfigureActivePipeline}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const label = stageDraftLabel.trim();
                              if (!label) return;
                              handleAddKanbanStage(label);
                              setStageDraftLabel("");
                            }}
                            disabled={!canConfigureActivePipeline || !stageDraftLabel.trim()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ fontWeight: 600 }}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2} />
                            Agregar columna
                          </button>
                        </div>
                      </div>
                    )}

                    {activePipelineGroupId && <section className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                      <div>
                        <h4 className="text-base text-brand-navy" style={{ fontWeight: 600 }}>Orden de columnas del pipeline</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Arrastra desde el ícono ⋮⋮ de cada fila para ordenar las columnas del Kanban (los botones y el selector de color no inician el arrastre). Usa el selector de color para el acento de cada columna en el tablero y la vista lista.
                        </p>
                      </div>

                      <DndProvider backend={HTML5Backend}>
                        <div className="mt-4 space-y-3">
                          {leadColumnStatuses.map((stageId, index) => {
                            const stageLabel = resolveStatusLabel(stageId);
                            const isEditing = editingStageId === stageId;
                            const leadsInStage = leads.filter(
                              (lead) =>
                                lead.status === stageId && lead.pipelineGroupId === activePipelineGroupId
                            ).length;

                            return (
                              <PipelineStageReorderRow
                                key={stageId}
                                index={index}
                                moveRow={handleReorderPipelineRows}
                                canDrag={canConfigureActivePipeline}
                              >
                                {(connectDragHandle) => (
                                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                      {canConfigureActivePipeline && (
                                        <div
                                          ref={connectDragHandle}
                                          className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-lg py-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 active:cursor-grabbing lg:pt-0.5"
                                          title="Arrastrar para reordenar columnas"
                                          aria-label={`Arrastrar para reordenar: ${stageLabel}`}
                                        >
                                          <GripVertical className="h-5 w-5" strokeWidth={1.75} />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        {isEditing ? (
                                          <input
                                            type="text"
                                            value={stageDraftLabel}
                                            onChange={(e) => setStageDraftLabel(e.target.value)}
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-navy focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                            disabled={!canConfigureActivePipeline}
                                          />
                                        ) : (
                                          <>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-sm text-brand-navy" style={{ fontWeight: 600 }}>
                                                {stageLabel}
                                              </p>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                              Clave: {stageId} · {leadsInStage} lead{leadsInStage === 1 ? "" : "s"} en esta etapa
                                            </p>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {canConfigureActivePipeline && !isEditing && (
                                          <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                                            Color columna
                                            <input
                                              type="color"
                                              value={resolveStageHex(stageId)}
                                              onChange={(e) => {
                                                const hex = e.target.value;
                                                const colorKey = normalizeLeadPipelineStatus(stageId);
                                                setPipelineByGroup((map) => {
                                                  const cur =
                                                    map[activePipelineGroupId] ??
                                                    createEmptyGroupPipelineSnapshot();
                                                  const nextColors = { ...cur.stageColors };
                                                  for (const k of Object.keys(nextColors)) {
                                                    if (
                                                      k !== colorKey &&
                                                      k.toLowerCase() === colorKey.toLowerCase()
                                                    ) {
                                                      delete nextColors[k];
                                                    }
                                                  }
                                                  nextColors[colorKey] = hex;
                                                  return {
                                                    ...map,
                                                    [activePipelineGroupId]: {
                                                      ...cur,
                                                      stageColors: nextColors,
                                                    },
                                                  };
                                                });
                                              }}
                                              className="h-8 w-11 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                                              title="Acento visual en Kanban, vista lista y chips de estado"
                                              aria-label={`Color de columna para ${stageLabel}`}
                                            />
                                          </label>
                                        )}
                                        {isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const label = stageDraftLabel.trim();
                                                if (!label) return;
                                                handleUpdateKanbanStage(stageId, label);
                                                setEditingStageId(null);
                                                setStageDraftLabel("");
                                              }}
                                              disabled={!canConfigureActivePipeline || !stageDraftLabel.trim()}
                                              className="inline-flex items-center rounded-lg bg-brand-navy px-3 py-2 text-xs text-white transition hover:bg-[#1e2a45] disabled:cursor-not-allowed disabled:opacity-50"
                                              style={{ fontWeight: 600 }}
                                            >
                                              Guardar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingStageId(null);
                                                setStageDraftLabel("");
                                              }}
                                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50"
                                              style={{ fontWeight: 600 }}
                                            >
                                              Cancelar
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingStageId(stageId);
                                                setStageDraftLabel(stageLabel);
                                              }}
                                              disabled={!canConfigureActivePipeline}
                                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                              style={{ fontWeight: 600 }}
                                            >
                                              <Edit className="h-3.5 w-3.5" strokeWidth={1.8} />
                                              Editar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => requestDeletePipelineStage(stageId, stageLabel)}
                                              disabled={!canConfigureActivePipeline}
                                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                              style={{ fontWeight: 600 }}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                              Eliminar
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </PipelineStageReorderRow>
                            );
                          })}
                        </div>
                      </DndProvider>

                      {/* ── Auto-move rules ──────────────────────────────── */}
                      <AutoMoveRulesPanel
                        stageIds={leadColumnStatuses}
                        resolveLabel={resolveStatusLabel}
                        rules={
                          (pipelineByGroup[activePipelineGroupId] ??
                            createEmptyGroupPipelineSnapshot()).stageRules
                        }
                        canEdit={canConfigureActivePipeline}
                        onChange={(nextRules) => {
                          setPipelineByGroup((map) => {
                            const cur =
                              map[activePipelineGroupId] ??
                              createEmptyGroupPipelineSnapshot();
                            return {
                              ...map,
                              [activePipelineGroupId]: {
                                ...cur,
                                stageRules: nextRules,
                              },
                            };
                          });
                        }}
                      />
                    </section>}
                  </div>
  );
}
