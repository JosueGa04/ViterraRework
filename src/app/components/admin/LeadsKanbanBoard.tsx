import { useMemo, useCallback, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { HorizontalScrollArea } from "./HorizontalScrollArea";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Lead } from "../../data/leads";
import { LeadPriorityBadge } from "./LeadPriorityBadge";
import { DEFAULT_CUSTOM_STAGE_HEX, stageHexToKanbanHeaderStyle } from "../../lib/stageColors";

const LEAD_ITEM = "VITERRA_LEAD_CARD";

type Props = {
  leads: Lead[];
  /** Orden de columnas: etapas incorporadas + ids personalizados. */
  columnStatuses: string[];
  /** Color de acento por id de etapa (hex), p. ej. desde configuración del pipeline */
  columnHexByStatus?: Record<string, string>;
  statusLabel: (status: string) => string;
  onStatusChange: (leadId: string, status: string) => void;
  onLeadOpen?: (lead: Lead) => void;
};

function DraggableLeadCard({
  lead,
  onOpenDetail,
}: {
  lead: Lead;
  onOpenDetail?: (lead: Lead) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: LEAD_ITEM,
      item: { id: lead.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [lead.id]
  );

  return (
    <div
      ref={(el) => { dragRef(el); }}
      data-hscroll-no-pan
      className={`group relative cursor-pointer overflow-hidden border border-slate-200 bg-white transition-colors active:cursor-grabbing ${
        isDragging ? "opacity-50" : "hover:border-slate-400"
      }`}
      onClick={() => onOpenDetail?.(lead)}
      title={`Abrir detalle de ${lead.name}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {lead.name}
          </p>
          <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
        </div>
        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide" style={{ letterSpacing: "0.05em" }}>
          <span className="font-medium text-slate-700">{lead.interest}</span>
          <span> · </span>
          {lead.propertyType}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <MapPin className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} aria-hidden />
          <span className="truncate">{lead.location}</span>
        </div>

        <p className="text-[11px] text-slate-500 uppercase tracking-wide border-t border-slate-100 pt-3">
          Asignado: <span className="font-medium text-slate-900">{lead.assignedTo}</span>
        </p>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  leadsInColumn,
  onDropLead,
  onLeadOpen,
  statusLabel,
  collapsed,
  onToggleCollapsed,
  accentHex,
}: {
  status: string;
  leadsInColumn: Lead[];
  onDropLead: (leadId: string, status: string) => void;
  onLeadOpen?: (lead: Lead) => void;
  statusLabel: (s: string) => string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  accentHex: string;
}) {
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: LEAD_ITEM,
      drop: (item: { id: string }) => {
        onDropLead(item.id, status);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [status, onDropLead]
  );

  const label = statusLabel(status);

  return (
    <div
      className={`flex shrink-0 flex-col overflow-hidden transition-[width,min-width] duration-300 ease-out ${
        collapsed
          ? "w-[3rem] min-w-[3rem] sm:w-[3.25rem] sm:min-w-[3.25rem]"
          : "w-[min(100%,268px)] min-w-[min(100%,268px)] sm:w-[248px] sm:min-w-[248px]"
      }`}
    >
      <div
        ref={(el) => { dropRef(el); }}
        className={`flex flex-col border border-slate-200 bg-slate-50 transition-colors ${
          isOver ? "bg-slate-100 border-slate-300" : ""
        } min-h-[min(70vh,560px)] flex-1`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-full min-h-[min(70vh,520px)] w-full flex-col items-center justify-start gap-4 border-0 bg-transparent px-0.5 pb-4 pt-4 text-left outline-none transition-colors hover:bg-slate-100"
            aria-expanded={false}
            aria-label={`Expandir columna ${label}`}
            title="Expandir columna"
          >
            <span className="text-xs font-semibold text-slate-900 border border-slate-200 bg-white px-2 py-0.5 min-w-[1.5rem] text-center">
              {leadsInColumn.length}
            </span>
            <span
              className="max-h-[min(50vh,280px)] shrink-0 overflow-hidden text-ellipsis text-[10px] font-bold uppercase tracking-widest text-slate-900"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {label}
            </span>
            <div className="min-h-0 flex-1" aria-hidden />
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
          </button>
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-t-xl border-b px-3 py-3"
              style={stageHexToKanbanHeaderStyle(accentHex)}
            >
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accentHex }} aria-hidden />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapsed();
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5"
                  aria-expanded
                  aria-label={`Colapsar columna ${label}`}
                  title="Colapsar columna (vista estrecha)"
                >
                  <ChevronLeft className="h-4 w-4" style={{ color: accentHex }} strokeWidth={2} />
                </button>
                <span
                  className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: accentHex }}
                >
                  {label}
                </span>
                <span
                  className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold shadow-sm"
                  style={{ color: accentHex }}
                >
                  {leadsInColumn.length}
                </span>
              </div>
            </div>
            <div className="flex min-h-[240px] flex-1 flex-col gap-3 p-3">
              {leadsInColumn.map((lead) => (
                <DraggableLeadCard key={lead.id} lead={lead} onOpenDetail={onLeadOpen} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function LeadsKanbanBoard({
  leads,
  columnStatuses,
  columnHexByStatus,
  statusLabel,
  onStatusChange,
  onLeadOpen,
}: Props) {
  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of columnStatuses) {
      map[s] = [];
    }
    for (const lead of leads) {
      if (!columnStatuses.includes(lead.status)) continue;
      const key = lead.status;
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    }
    return map;
  }, [leads, columnStatuses]);

  /** true = colapsada. Por defecto todas expandidas (incluso vacías) para ver el pipeline completo; el usuario puede colapsar. */
  const [collapsedByStatus, setCollapsedByStatus] = useState<Record<string, boolean>>({});

  const columnCollapsed = useCallback(
    (status: string) => {
      if (Object.prototype.hasOwnProperty.call(collapsedByStatus, status)) {
        return collapsedByStatus[status];
      }
      return false;
    },
    [collapsedByStatus],
  );

  const toggleColumnCollapsed = useCallback((status: string) => {
    setCollapsedByStatus((m) => {
      const cur = m[status] ?? false;
      return { ...m, [status]: !cur };
    });
  }, []);

  const handleDrop = useCallback(
    (leadId: string, newStatus: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        onStatusChange(leadId, newStatus);
      }
    },
    [leads, onStatusChange]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white border-y border-slate-200">
        <div className="px-4 py-6 md:px-6">
          <p className="mb-6 text-xs uppercase tracking-widest text-slate-500 font-semibold">
            Arrastra las tarjetas entre columnas para actualizar el estado
          </p>
          <HorizontalScrollArea
            ariaLabel="Pipeline de leads por columna"
            contentClassName="pb-2 pt-0.5"
            hintPlacement="top"
          >
            <div className="flex w-max min-w-full gap-6">
              {columnStatuses.map((status) => (
                <KanbanColumn
                  key={status}
                status={status}
                leadsInColumn={byStatus[status] ?? []}
                onDropLead={handleDrop}
                onLeadOpen={onLeadOpen}
                statusLabel={statusLabel}
                collapsed={columnCollapsed(status)}
                onToggleCollapsed={() => toggleColumnCollapsed(status)}
                accentHex={columnHexByStatus?.[status] ?? DEFAULT_CUSTOM_STAGE_HEX}
              />
            ))}
            </div>
          </HorizontalScrollArea>
        </div>
      </div>
    </DndProvider>
  );
}
