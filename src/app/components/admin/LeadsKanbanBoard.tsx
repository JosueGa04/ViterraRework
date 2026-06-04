import { useMemo, useCallback, useState, useRef, memo, type ReactNode } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { HorizontalScrollArea } from "./HorizontalScrollArea";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Lead } from "../../data/leads";
import { LeadPriorityBadge } from "./LeadPriorityBadge";
import { DEFAULT_CUSTOM_STAGE_HEX, stageHexToKanbanHeaderStyle } from "../../lib/stageColors";

const LEAD_ITEM = "VITERRA_LEAD_CARD";

type DragItem = { id: string };

/** Orden manual dentro de la columna; sin valor → al final, preservando el orden de carga. */
function leadOrderKey(lead: Lead): number {
  return typeof lead.sortOrder === "number" && Number.isFinite(lead.sortOrder)
    ? lead.sortOrder
    : Number.POSITIVE_INFINITY;
}

type Props = {
  leads: Lead[];
  /** Orden de columnas: etapas incorporadas + ids personalizados. */
  columnStatuses: string[];
  /** Color de acento por id de etapa (hex), p. ej. desde configuración del pipeline */
  columnHexByStatus?: Record<string, string>;
  statusLabel: (status: string) => string;
  /** `beforeId`: id del lead ante el cual insertar (null = al final). Lo envía el Kanban para colocar la tarjeta donde se ve el hueco. */
  onStatusChange: (leadId: string, status: string, beforeId?: string | null) => void;
  onLeadOpen?: (lead: Lead) => void;
};

const DraggableLeadCard = memo(function DraggableLeadCard({
  lead,
  onOpenDetail,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  onOpenDetail?: (lead: Lead) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: LEAD_ITEM,
      item: () => {
        onDragStart(lead.id);
        return { id: lead.id } as DragItem;
      },
      end: () => onDragEnd(),
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [lead.id, onDragStart, onDragEnd]
  );

  return (
    <div
      ref={(el) => {
        dragRef(el);
      }}
      data-lead-card
      data-hscroll-no-pan
      className={`group relative overflow-hidden border bg-white transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out ${
        isDragging
          ? "scale-[0.98] cursor-grabbing border-slate-300 opacity-40"
          : "cursor-grab border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md active:cursor-grabbing"
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
});

/** Hueco animado que indica dónde se insertará la tarjeta. */
function DropSlot({ accentHex }: { accentHex: string }) {
  return (
    <div
      className="viterra-kanban-slot flex min-h-[4.5rem] items-center justify-center rounded-md border-2 border-dashed text-[11px] font-bold uppercase tracking-widest"
      style={{
        borderColor: accentHex,
        color: accentHex,
        backgroundColor: `${accentHex}14`,
      }}
      aria-hidden
    >
      Soltar aquí
    </div>
  );
}

const KanbanColumn = memo(function KanbanColumn({
  status,
  leadsInColumn,
  onDropLead,
  onLeadOpen,
  statusLabel,
  collapsed,
  onToggleCollapsed,
  accentHex,
  dropIndex,
  onHoverIndex,
  onDragStart,
  onDragEnd,
}: {
  status: string;
  leadsInColumn: Lead[];
  onDropLead: (leadId: string, status: string, beforeId: string | null) => void;
  onLeadOpen?: (lead: Lead) => void;
  statusLabel: (s: string) => string;
  collapsed: boolean;
  onToggleCollapsed: (status: string) => void;
  accentHex: string;
  /** Índice del hueco en esta columna, o null si no es la columna objetivo. */
  dropIndex: number | null;
  onHoverIndex: (status: string, index: number) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastYRef = useRef<number>(-1);

  /** Calcula el índice de inserción comparando el cursor con el centro de cada tarjeta. */
  const computeIndex = useCallback((clientY: number) => {
    const container = listRef.current;
    if (!container) return leadsInColumn.length;
    const cards = container.querySelectorAll<HTMLElement>("[data-lead-card]");
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length;
  }, [leadsInColumn.length]);

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: LEAD_ITEM,
      hover: (_item, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset) return;
        // Evita recomputar/rerenderizar si el cursor apenas se movió.
        if (Math.abs(offset.y - lastYRef.current) < 3) return;
        lastYRef.current = offset.y;
        onHoverIndex(status, computeIndex(offset.y));
      },
      drop: (item: DragItem, monitor) => {
        if (monitor.didDrop()) return;
        const offset = monitor.getClientOffset();
        const renderedIndex = offset ? computeIndex(offset.y) : leadsInColumn.length;
        const draggedPos = leadsInColumn.findIndex((l) => l.id === item.id);
        let beforeId: string | null;
        if (draggedPos === -1) {
          beforeId = leadsInColumn[renderedIndex]?.id ?? null;
        } else {
          const adjusted = renderedIndex > draggedPos ? renderedIndex - 1 : renderedIndex;
          const existing = leadsInColumn.filter((l) => l.id !== item.id);
          beforeId = existing[adjusted]?.id ?? null;
        }
        onDropLead(item.id, status, beforeId);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [status, computeIndex, onHoverIndex, onDropLead, leadsInColumn]
  );

  const label = statusLabel(status);
  const showSlot = dropIndex !== null;

  const cardNodes: ReactNode[] = [];
  leadsInColumn.forEach((lead, i) => {
    if (i === dropIndex) {
      cardNodes.push(<DropSlot key="__slot__" accentHex={accentHex} />);
    }
    cardNodes.push(
      <DraggableLeadCard
        key={lead.id}
        lead={lead}
        onOpenDetail={onLeadOpen}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
  });
  if (showSlot && dropIndex! >= leadsInColumn.length) {
    cardNodes.push(<DropSlot key="__slot__" accentHex={accentHex} />);
  }

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
        className={`flex flex-col border bg-slate-50 transition-colors min-h-[min(70vh,560px)] flex-1 ${
          isOver ? "border-slate-300 bg-slate-100/70 ring-1 ring-slate-300" : "border-slate-200"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => onToggleCollapsed(status)}
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
                    onToggleCollapsed(status);
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
            <div ref={listRef} className="flex min-h-[240px] flex-1 flex-col gap-3 p-3">
              {cardNodes}
              {leadsInColumn.length === 0 && !showSlot && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 py-8 text-center text-[11px] uppercase tracking-widest text-slate-400">
                  Sin leads
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

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
    // Orden manual persistido (sortOrder); los sin valor conservan el orden de carga (sort estable).
    for (const key of Object.keys(map)) {
      map[key] = map[key]
        .map((lead, i) => ({ lead, i }))
        .sort((a, b) => leadOrderKey(a.lead) - leadOrderKey(b.lead) || a.i - b.i)
        .map((x) => x.lead);
    }
    return map;
  }, [leads, columnStatuses]);

  /** true = colapsada. Por defecto todas expandidas (incluso vacías) para ver el pipeline completo; el usuario puede colapsar. */
  const [collapsedByStatus, setCollapsedByStatus] = useState<Record<string, boolean>>({});

  /** Lead que se está arrastrando + posición de inserción mostrada (hueco). */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: string; index: number } | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleHoverIndex = useCallback((status: string, index: number) => {
    setDropTarget((prev) =>
      prev && prev.status === status && prev.index === index ? prev : { status, index }
    );
  }, []);

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
    (leadId: string, newStatus: string, beforeId: string | null) => {
      onStatusChange(leadId, newStatus, beforeId);
    },
    [onStatusChange]
  );

  const activeDropStatus = draggingId != null ? dropTarget?.status ?? null : null;

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
                  onToggleCollapsed={toggleColumnCollapsed}
                  accentHex={columnHexByStatus?.[status] ?? DEFAULT_CUSTOM_STAGE_HEX}
                  dropIndex={activeDropStatus === status ? dropTarget!.index : null}
                  onHoverIndex={handleHoverIndex}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </HorizontalScrollArea>
        </div>
      </div>
    </DndProvider>
  );
}
