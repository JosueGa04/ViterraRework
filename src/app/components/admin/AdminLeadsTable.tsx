import { ChevronDown, Edit, Eye, Trash2, Users } from "lucide-react";
import type { Lead } from "../../data/leads";
import type { LeadTableSection } from "../../pages/admin/leadsGrouping";
import { LeadPriorityBadge } from "./LeadPriorityBadge";
import { cn } from "../ui/utils";
import {
  LIST_STAGE_HEADER_BUTTON_CLASSES,
  stageHexToChipStyle,
  stageHexToListHeaderStyle,
} from "../../lib/stageColors";

type Props = {
  filteredLeads: Lead[];
  leadsTableGroupedByStatus: LeadTableSection[];
  leadsTableSectionCollapsed: Record<string, boolean>;
  toggleLeadsTableSection: (statusId: string) => void;
  resolveStageHex: (status: string) => string;
  statusSelectOptions: { value: string; label: string }[];
  openLeadDetail: (lead: Lead, mode: "view" | "edit") => void;
  handleUpdateLeadStatus: (id: string, status: string) => void;
  handleDeleteLead: (id: string) => void | Promise<void>;
};

/** Vista de tabla de Leads: secciones por estado (colapsables) con acciones por lead. */
export function AdminLeadsTable({
  filteredLeads,
  leadsTableGroupedByStatus,
  leadsTableSectionCollapsed,
  toggleLeadsTableSection,
  resolveStageHex,
  statusSelectOptions,
  openLeadDetail,
  handleUpdateLeadStatus,
  handleDeleteLead,
}: Props) {
  return (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_8px_32px_-10px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02]">
                  {filteredLeads.length === 0 ? (
                    <div className="py-16 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm text-slate-500" style={{ fontWeight: 500 }}>
                        No se encontraron leads
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/80">
                      {leadsTableGroupedByStatus.map(({ statusId, label, leads: sectionLeads }) => {
                        const sectionCollapsed = leadsTableSectionCollapsed[statusId] === true;
                        return (
                          <section key={statusId} className="bg-white">
                            <button
                              type="button"
                              onClick={() => toggleLeadsTableSection(statusId)}
                              className={LIST_STAGE_HEADER_BUTTON_CLASSES}
                              style={stageHexToListHeaderStyle(resolveStageHex(statusId))}
                              aria-expanded={!sectionCollapsed}
                              aria-label={
                                sectionCollapsed ? `Expandir sección ${label}, ${sectionLeads.length} leads` : `Contraer sección ${label}`
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ease-out",
                                  sectionCollapsed ? "-rotate-90" : "rotate-0",
                                )}
                                strokeWidth={2}
                                aria-hidden
                              />
                              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h3
                                  className="font-heading inline-block bg-gradient-to-br from-brand-navy via-[#1a2744] to-brand-navy bg-clip-text text-base tracking-tight text-transparent sm:text-[1.125rem]"
                                  style={{ fontWeight: 700 }}
                                >
                                  {label}
                                </h3>
                                <span
                                  className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-800 shadow-sm ring-1 ring-slate-200/90 backdrop-blur-sm"
                                  style={{ fontWeight: 700 }}
                                >
                                  {sectionLeads.length}
                                </span>
                              </div>
                            </button>
                            <div
                              className={cn(
                                "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                                sectionCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                              )}
                            >
                              <div className="min-h-0 overflow-hidden">
                                <ul className="divide-y divide-slate-100 border-t border-slate-100/90 bg-white">
                                  {sectionLeads.map((lead) => (
                                    <li
                                      key={lead.id}
                                      className="py-1.5 pl-5 pr-3 transition-colors hover:bg-slate-50/90 sm:pl-8 sm:pr-4"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                                <p
                                                  className="text-[13.6px] font-semibold leading-none tracking-tight text-slate-900"
                                                  style={{ fontWeight: 600 }}
                                                >
                                                  {lead.name}
                                                </p>
                                                <span className="text-[10.2px] text-slate-500" style={{ fontWeight: 500 }}>
                                                  {lead.source}
                                                </span>
                                              </div>
                                              <p className="mt-px text-[11.9px] leading-tight text-slate-600">
                                                <span className="inline break-words">{lead.email}</span>
                                                <span className="mx-1 text-slate-300">·</span>
                                                <span>{lead.phone}</span>
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 sm:hidden">
                                              <div className="flex h-8 items-center">
                                                <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
                                              </div>
                                              <div className="flex h-8 items-center gap-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => openLeadDetail(lead, "view")}
                                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                                  title="Ver"
                                                >
                                                  <Eye className="h-6 w-6" strokeWidth={1.5} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openLeadDetail(lead, "edit")}
                                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                                  title="Editar"
                                                >
                                                  <Edit className="h-6 w-6" strokeWidth={1.5} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (window.confirm("¿Eliminar este lead?")) {
                                                      void handleDeleteLead(lead.id);
                                                    }
                                                  }}
                                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="h-6 w-6" strokeWidth={1.5} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                          <p className="mt-1 min-w-0 text-[11.9px] leading-tight text-slate-600">
                                            <span className="font-semibold capitalize text-slate-800">{lead.interest}</span>
                                            <span className="mx-1 text-slate-300">·</span>
                                            <span>{lead.propertyType}</span>
                                            <span className="mx-1 text-slate-300">·</span>
                                            <span className="font-semibold tabular-nums text-slate-900">${lead.budget.toLocaleString()}</span>
                                            <span className="mx-1 text-slate-300">·</span>
                                            <span className="text-slate-600">{lead.location}</span>
                                          </p>
                                          <div className="mt-1.5 sm:hidden">
                                            <select
                                              id={`lead-status-${lead.id}`}
                                              value={lead.status}
                                              onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                              className="h-8 w-full min-w-0 max-w-full cursor-pointer rounded-md px-2 py-0 text-[11.9px] font-semibold shadow-sm"
                                              style={{
                                                fontWeight: 600,
                                                ...stageHexToChipStyle(resolveStageHex(lead.status)),
                                              }}
                                              aria-label={`Cambiar estado de ${lead.name}`}
                                            >
                                              {statusSelectOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                  {opt.label}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>

                                        <div className="hidden shrink-0 items-center gap-2 sm:flex">
                                          <div className="flex h-8 items-center">
                                            <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
                                          </div>
                                          <select
                                            value={lead.status}
                                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                            className="h-8 min-w-[8.75rem] max-w-full cursor-pointer rounded-md px-2 py-0 text-[11.9px] font-semibold shadow-sm sm:min-w-[9.25rem]"
                                            style={{
                                              fontWeight: 600,
                                              ...stageHexToChipStyle(resolveStageHex(lead.status)),
                                            }}
                                            aria-label={`Cambiar estado de ${lead.name}`}
                                          >
                                            {statusSelectOptions.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                          <div className="flex h-8 items-center gap-0.5">
                                            <button
                                              type="button"
                                              onClick={() => openLeadDetail(lead, "view")}
                                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                              title="Ver"
                                            >
                                              <Eye className="h-6 w-6" strokeWidth={1.5} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => openLeadDetail(lead, "edit")}
                                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                              title="Editar"
                                            >
                                              <Edit className="h-6 w-6" strokeWidth={1.5} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (window.confirm("¿Eliminar este lead?")) {
                                                  void handleDeleteLead(lead.id);
                                                }
                                              }}
                                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                              title="Eliminar"
                                            >
                                              <Trash2 className="h-6 w-6" strokeWidth={1.5} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
  );
}
