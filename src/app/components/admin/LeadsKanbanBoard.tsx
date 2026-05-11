import { useMemo, useCallback, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Lead } from "../../data/leads";
import { LeadPriorityBadge } from "./LeadPriorityBadge";
import { DEFAULT_CUSTOM_STAGE_HEX, stageHexToKanbanHeaderStyle } from "../../lib/stageColors";

const LEAD_ITEM = "VITERRA_LEAD_CARD";

/** Mismo patrón + acento que el antiguo bloque superior del tablero. */
const KANBAN_CARD_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

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
      ref={(el) => {
        dragRef(el);
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 active:cursor-grabbing ${
        isDragging ? "scale-[0.98] opacity-60 shadow-lg" : "hover:border-slate-300/90 hover:shadow-md"
      }`}
      onClick={() => onOpenDetail?.(lead)}
      title={`Abrir detalle de ${lead.name}`}
    >
      {/* Cabecera: solo aquí patrón navy + franja de acento */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-[#182236] to-brand-navy px-3.5 pb-3 pt-3 pr-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: KANBAN_CARD_PATTERN }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
          aria-hidden
        />
        <div className="relative">
          <p className="font-heading text-sm font-semibold leading-snug text-white" style={{ fontWeight: 600 }}>
            {lead.name}
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/75" style={{ fontWeight: 500 }}>
            <span className="capitalize">{lead.interest}</span>
            <span className="text-white/40"> · </span>
            {lead.propertyType}
          </p>
        </div>
      </div>
      {/* Cuerpo: fondo claro */}
      <div className="border-t border-slate-100/90 bg-white px-3.5 py-2.5">
        <div className="mb-2">
          <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600" style={{ fontWeight: 500 }}>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} aria-hidden />
          <span className="truncate underline decoration-primary/80 decoration-1 underline-offset-2">{lead.location}</span>
        </div>
        <p
          className="mt-2 truncate border-t border-slate-100 pt-2 text-[11px] text-slate-500"
          style={{
            fontFamily: 'Perpetua, "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
            fontWeight: 400,
          }}
        >
          Asignado: <span className="font-sans font-medium text-slate-700">{lead.assignedTo}</span>
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
        ref={(el) => {
          dropRef(el);
        }}
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/40 shadow-[inset_0_1px_2px_rgba(20,28,46,0.04)] transition-colors ${
          isOver ? "bg-primary/[0.04] ring-2 ring-primary/30 ring-offset-2 ring-offset-slate-50/50" : ""
        } min-h-[min(70vh,560px)] flex-1`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-full min-h-[min(70vh,520px)] w-full flex-col items-center justify-start gap-2 border-0 bg-transparent px-0.5 pb-3 pt-3 text-left outline-none transition-colors hover:bg-slate-100/50"
            aria-expanded={false}
            aria-label={`Expandir columna ${label}`}
            title="Expandir columna"
          >
            <span
              className="font-heading min-w-[1.35rem] shrink-0 rounded-full bg-white/95 px-1.5 py-0.5 text-center text-[10px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80"
              style={{ fontWeight: 600 }}
            >
              {leadsInColumn.length}
            </span>
            <span
              className="font-heading max-h-[min(50vh,280px)] shrink-0 overflow-hidden text-ellipsis text-[9px] font-semibold uppercase leading-normal tracking-[0.12em]"
              style={{
                fontWeight: 600,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                color: accentHex,
              }}
            >
              {label}
            </span>
            <div className="min-h-0 flex-1" aria-hidden />
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-t-2xl border-b px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-3 sm:py-3"
              style={stageHexToKanbanHeaderStyle(accentHex)}
            >
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" aria-hidden />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapsed();
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-brand-navy"
                  aria-expanded
                  aria-label={`Colapsar columna ${label}`}
                  title="Colapsar columna (vista estrecha)"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <span
                  className="font-heading min-w-0 flex-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] sm:tracking-[0.2em]"
                  style={{ fontWeight: 600, color: accentHex }}
                >
                  {label}
                </span>
                <span
                  className="font-heading min-w-[1.5rem] shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-center text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80"
                  style={{ fontWeight: 600 }}
                >
                  {leadsInColumn.length}
                </span>
              </div>
            </div>
            <div className="flex min-h-[240px] flex-1 flex-col gap-2.5 rounded-b-2xl p-2.5">
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
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_16px_48px_-12px_rgba(20,28,46,0.18)] ring-1 ring-black/[0.03]">
        <div className="crm-kanban-scroll bg-gradient-to-b from-brand-canvas/55 via-slate-50/90 to-slate-100/80 px-4 py-5 pb-6 md:px-6">
          <p className="mb-4 text-center text-xs uppercase tracking-[0.28em] text-slate-500" style={{ fontWeight: 600 }}>
            Arrastra las tarjetas entre columnas para actualizar el estado
          </p>
          <div className="flex gap-4 overflow-x-auto pb-1 md:gap-5">
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
        </div>
      </div>
    </DndProvider>
  );
}
