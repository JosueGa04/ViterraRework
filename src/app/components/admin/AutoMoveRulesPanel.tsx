import { useState } from "react";
import { ArrowRight, ChevronDown, Plus, Timer, Trash2 } from "lucide-react";
import type { StageAutoMoveRule } from "../../lib/pipelineByGroup";
import { cn } from "../ui/utils";

type AutoMoveRulesPanelProps = {
  /** Ordered list of stage ids visible in the pipeline (used to build dropdowns). */
  stageIds: string[];
  resolveLabel: (id: string) => string;
  rules: StageAutoMoveRule[];
  canEdit: boolean;
  onChange: (next: StageAutoMoveRule[]) => void;
};

export function AutoMoveRulesPanel({
  stageIds,
  resolveLabel,
  rules,
  canEdit,
  onChange,
}: AutoMoveRulesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [draftFrom, setDraftFrom] = useState(stageIds[0] ?? "");
  const [draftTo, setDraftTo] = useState(stageIds[1] ?? stageIds[0] ?? "");
  const [draftDays, setDraftDays] = useState<string>("3");

  const fieldClass =
    "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-brand-navy focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10";

  const handleAdd = () => {
    if (!draftFrom || !draftTo) return;
    if (draftFrom === draftTo) return;
    const parsedDays = parseInt(draftDays.trim(), 10);
    if (draftDays.trim() === "" || !Number.isFinite(parsedDays) || parsedDays < 0) return;
    const next: StageAutoMoveRule[] = [
      ...rules,
      { fromStageId: draftFrom, toStageId: draftTo, afterDays: parsedDays },
    ];
    onChange(next);
    // Reset to safe defaults after adding.
    setDraftFrom(stageIds[0] ?? "");
    setDraftTo(stageIds[1] ?? stageIds[0] ?? "");
    setDraftDays("3");
  };

  const handleDelete = (idx: number) => {
    onChange(rules.filter((_, i) => i !== idx));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50/70"
      >
        <div className="flex items-center gap-2.5">
          <Timer className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
          <div>
            <p className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
              Reglas de avance automático
            </p>
            <p className="mt-0.5 text-xs text-slate-500" style={{ fontWeight: 500 }}>
              {rules.length === 0
                ? "Sin reglas configuradas"
                : `${rules.length} regla${rules.length === 1 ? "" : "s"} activa${rules.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", expanded && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-200/80 px-5 pb-5 pt-4">
          <p className="mb-4 text-xs leading-relaxed text-slate-500" style={{ fontWeight: 500 }}>
            Si un lead permanece en una etapa más de{" "}
            <span className="font-semibold text-brand-navy">N días</span> sin ser movido
            manualmente, el sistema lo moverá a la etapa destino automáticamente la próxima vez que
            se abra el CRM.
          </p>

          {/* Existing rules list */}
          {rules.length > 0 && (
            <ul className="mb-4 space-y-2">
              {rules.map((rule, idx) => (
                <li
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 px-2 py-1 text-xs text-primary" style={{ fontWeight: 600 }}>
                    {resolveLabel(rule.fromStageId)}
                  </span>
                  <span className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                    permanece más de
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-brand-navy" style={{ fontWeight: 700 }}>
                    <Timer className="h-3 w-3 text-slate-400" strokeWidth={1.75} />
                    {rule.afterDays} {rule.afterDays === 1 ? "día" : "días"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700" style={{ fontWeight: 600 }}>
                    {resolveLabel(rule.toStageId)}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      title="Eliminar regla"
                      aria-label={`Eliminar regla: ${resolveLabel(rule.fromStageId)} → ${resolveLabel(rule.toStageId)}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {rules.length === 0 && (
            <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-center text-xs text-slate-500">
              No hay reglas configuradas todavía.
            </div>
          )}

          {/* Add new rule form */}
          {canEdit && stageIds.length >= 2 && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 700 }}>
                Agregar regla
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600" style={{ fontWeight: 600 }}>Si un lead está en</span>
                <select
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className={fieldClass}
                  aria-label="Etapa origen"
                >
                  {stageIds.map((id) => (
                    <option key={id} value={id}>
                      {resolveLabel(id)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-600" style={{ fontWeight: 600 }}>más de</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draftDays}
                  onChange={(e) => setDraftDays(e.target.value)}
                  className={cn(fieldClass, "w-20 text-center")}
                  aria-label="Número de días"
                />
                <span className="text-xs text-slate-600" style={{ fontWeight: 600 }}>días → mover a</span>
                <select
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className={fieldClass}
                  aria-label="Etapa destino"
                >
                  {stageIds
                    .filter((id) => id !== draftFrom)
                    .map((id) => (
                      <option key={id} value={id}>
                        {resolveLabel(id)}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={
                    !draftFrom ||
                    !draftTo ||
                    draftFrom === draftTo ||
                    draftDays.trim() === "" ||
                    !Number.isFinite(parseInt(draftDays.trim(), 10)) ||
                    parseInt(draftDays.trim(), 10) < 0
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Agregar
                </button>
              </div>
            </div>
          )}

          {canEdit && stageIds.length < 2 && (
            <p className="text-xs text-slate-400">
              Necesitas al menos 2 etapas en el pipeline para crear reglas de avance.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
