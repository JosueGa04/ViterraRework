/** Etapas fijas del embudo; también pueden existir etapas personalizadas (`custom_*`). */
export type LeadBuiltinStatus =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "negociacion"
  | "cerrado"
  | "perdido";

/** Entrada del historial de notas del cliente (texto libre + fecha asociada). */
export interface LeadClientNote {
  id: string;
  /** Fecha de la nota (YYYY-MM-DD). */
  date: string;
  body: string;
}

export interface LeadActivityEntry {
  id: string;
  type: "created" | "status_change" | "updated" | "comment";
  createdAt: string;
  description: string;
  status?: string;
}

/** Nivel de prioridad por estrellas (1 = mínima, 6 = máxima). */
export type LeadPriorityStars = 1 | 2 | 3 | 4 | 5 | 6;

export function newLeadClientNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `lnote_${crypto.randomUUID()}`;
  }
  return `lnote_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newLeadActivityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `lact_${crypto.randomUUID()}`;
  }
  return `lact_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clampLeadPriorityStars(n: number): LeadPriorityStars {
  const x = Math.round(Number(n));
  if (Number.isNaN(x) || x < 1) return 1;
  if (x > 6) return 6;
  return x as LeadPriorityStars;
}

function migrateLegacyPriority(raw: unknown): LeadPriorityStars {
  if (typeof raw === "number" && !Number.isNaN(raw)) return clampLeadPriorityStars(raw);
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    return clampLeadPriorityStars(parseInt(raw, 10));
  }
  if (raw === "alta") return 5;
  if (raw === "media") return 3;
  if (raw === "baja") return 2;
  return 3;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: "compra" | "venta" | "alquiler" | "asesoria";
  propertyType: string;
  budget: number;
  location: string;
  /** Clave de etapa: incorporada o id de etapa personalizada (`custom_*`). */
  status: string;
  /** Prioridad visual 1–6 estrellas (mayor número = mayor prioridad). */
  priorityStars: LeadPriorityStars;
  source: string;
  /** Nombre para mostrar (asesor asignado) */
  assignedTo: string;
  /** ID de usuario CRM; el asesor solo ve leads con su id */
  assignedToUserId: string;
  /** Pipeline de ventas (grupo de trabajo) al que pertenece el lead; columnas Kanban dependen de este id */
  pipelineGroupId: string;
  /** Historial de notas (cada una con fecha y texto libre). */
  clientNotes: LeadClientNote[];
  /** Vínculo opcional a inventario existente. */
  relatedPropertyId?: string;
  relatedDevelopmentId?: string;
  /** Historial de movimientos/acciones del lead para pestaña de actividad. */
  activity?: LeadActivityEntry[];
  createdAt: string;
  /**
   * Marca completa de creación (ISO con hora). Se preserva además de `createdAt` (que sigue siendo
   * `YYYY-MM-DD` por compatibilidad con el resto del CRM). Útil para mostrar hora en Consultas.
   */
  createdAtIso?: string;
  lastContact: string;
  updatedAt?: string;
  /** Fecha ISO en que se realizó el soft-delete (`deleted_at` en Supabase). Puede venir de Tokko u del CRM. */
  deletedAt?: string | null;
  /**
   * Marca de archivo solo cuando el admin elimina el lead desde el panel (no confundir con `deleted_at`
   * de Tokko, que a veces viene informado en filas activas).
   */
  crmSoftDeletedAt?: string | null;
  /** Orden manual dentro de su columna del Kanban (menor = más arriba). Se persiste en `payload.sortOrder`. */
  sortOrder?: number;
}

/**
 * Ya no existen columnas fijas de sistema.
 * Se conserva el tipo/labels legacy para compatibilidad de datos históricos.
 */
export const BUILTIN_STATUS_ORDER: LeadBuiltinStatus[] = [];

export const LEAD_STATUS_LABEL: Record<LeadBuiltinStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  negociacion: "Negociación",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

const BUILTIN_STATUS_KEYS = new Set<string>(Object.keys(LEAD_STATUS_LABEL));

/** Unifica `CUSTOM_uuid` vs `custom_uuid` y mayúsculas en etapas incorporadas para alinear Kanban y etiquetas. */
export function normalizeLeadPipelineStatus(statusRaw: string): string {
  const s = statusRaw.trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (BUILTIN_STATUS_KEYS.has(lower)) return lower;
  const m = /^custom_([0-9a-f-]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(s);
  if (m) return `custom_${m[1].toLowerCase()}`;
  return s;
}

export type CustomKanbanStage = { id: string; label: string };

export function newCustomStageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom_${crypto.randomUUID()}`;
  }
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Etiqueta legible si el id de etapa no está en catálogo (p. ej. datos legacy con prefijo distinto). */
function humanizeOrphanCustomStageId(status: string): string {
  const s = status.trim();
  const uuidLike = /^custom_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(s);
  if (uuidLike) {
    return `Etapa personalizada (${uuidLike[1].slice(0, 8)}…)`;
  }
  if (/^custom_/i.test(s)) {
    return "Etapa personalizada";
  }
  return s;
}

export function labelForLeadStatus(status: string, customStages: CustomKanbanStage[] = []): string {
  const key = status.trim();
  if (Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABEL, key)) {
    return LEAD_STATUS_LABEL[key as LeadBuiltinStatus];
  }
  if (Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABEL, key.toLowerCase())) {
    return LEAD_STATUS_LABEL[key.toLowerCase() as LeadBuiltinStatus];
  }
  const custom =
    customStages.find((st) => st.id === key) ??
    customStages.find((st) => st.id.toLowerCase() === key.toLowerCase());
  if (custom?.label?.trim()) return custom.label.trim();
  return humanizeOrphanCustomStageId(key);
}

const BY_ASSIGNED_NAME: Record<string, string> = {
  "María González": "4",
  "Carlos Rodríguez": "5",
  "Ana Martínez": "3",
  "Laura Méndez": "3",
};

export function migrateClientNotes(raw: Partial<Lead> & Record<string, unknown>): LeadClientNote[] {
  if (Array.isArray(raw.clientNotes)) {
    const out: LeadClientNote[] = [];
    for (const item of raw.clientNotes) {
      if (!item || typeof item !== "object") continue;
      const o = item as unknown as Record<string, unknown>;
      const dateRaw = typeof o.date === "string" ? o.date : "";
      const date =
        /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);
      out.push({
        id: typeof o.id === "string" && o.id ? o.id : newLeadClientNoteId(),
        date,
        body: String(o.body ?? ""),
      });
    }
    return out;
  }
  const legacy = String(raw.notes ?? "").trim();
  if (legacy) {
    const created = String(raw.createdAt ?? new Date().toISOString().slice(0, 10));
    return [
      {
        id: newLeadClientNoteId(),
        date: /^\d{4}-\d{2}-\d{2}/.test(created) ? created.slice(0, 10) : new Date().toISOString().slice(0, 10),
        body: legacy,
      },
    ];
  }
  return [];
}

export function migrateLeadActivity(raw: Partial<Lead> & Record<string, unknown>): LeadActivityEntry[] {
  if (Array.isArray(raw.activity)) {
    const out: LeadActivityEntry[] = [];
    for (const item of raw.activity) {
      if (!item || typeof item !== "object") continue;
      const o = item as unknown as Record<string, unknown>;
      const type =
        o.type === "created" || o.type === "status_change" || o.type === "updated" || o.type === "comment"
          ? o.type
          : "updated";
      out.push({
        id: typeof o.id === "string" && o.id ? o.id : newLeadActivityId(),
        type,
        createdAt:
          typeof o.createdAt === "string" && o.createdAt
            ? o.createdAt
            : new Date().toISOString(),
        description: String(o.description ?? "Actividad registrada"),
        status: typeof o.status === "string" ? o.status : undefined,
      });
    }
    return out;
  }

  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  return [
    {
      id: newLeadActivityId(),
      type: "created",
      createdAt,
      description: "Lead creado",
    },
  ];
}

/** Ordena por fecha descendente (más reciente primero). */
export function sortLeadClientNotesNewestFirst(notes: LeadClientNote[]): LeadClientNote[] {
  return [...notes].sort((a, b) => {
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return tb - ta;
  });
}

/** Normaliza datos guardados en localStorage antes de la nueva versión. */
export function normalizeStoredLead(raw: Partial<Lead> & Record<string, unknown>): Lead {
  let assignedToUserId =
    typeof raw.assignedToUserId === "string" ? raw.assignedToUserId : undefined;
  if (!assignedToUserId && typeof raw.assignedTo === "string") {
    assignedToUserId = BY_ASSIGNED_NAME[raw.assignedTo] ?? "";
  }
  if (!assignedToUserId) assignedToUserId = "";

  const pipelineGroupId =
    typeof raw.pipelineGroupId === "string" && raw.pipelineGroupId.length > 0
      ? raw.pipelineGroupId
      : "__default__";

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    interest: (raw.interest as Lead["interest"]) ?? "compra",
    propertyType: String(raw.propertyType ?? ""),
    budget: typeof raw.budget === "number" ? raw.budget : Number(raw.budget) || 0,
    location: String(raw.location ?? ""),
    status:
      typeof raw.status === "string" && raw.status.length > 0
        ? normalizeLeadPipelineStatus(raw.status)
        : "",
    priorityStars: migrateLegacyPriority(
      raw.priorityStars !== undefined ? raw.priorityStars : raw.priority
    ),
    source: String(raw.source ?? ""),
    assignedTo: String(raw.assignedTo ?? "Sin asignar"),
    assignedToUserId,
    pipelineGroupId,
    clientNotes: migrateClientNotes(raw),
    relatedPropertyId:
      typeof raw.relatedPropertyId === "string" && raw.relatedPropertyId.trim().length > 0
        ? raw.relatedPropertyId
        : undefined,
    relatedDevelopmentId:
      typeof raw.relatedDevelopmentId === "string" && raw.relatedDevelopmentId.trim().length > 0
        ? raw.relatedDevelopmentId
        : undefined,
    activity: migrateLeadActivity(raw),
    createdAt: String(raw.createdAt ?? today),
    createdAtIso:
      typeof raw.createdAtIso === "string" && raw.createdAtIso ? raw.createdAtIso : undefined,
    lastContact: String(raw.lastContact ?? today),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    deletedAt:
      typeof raw.deletedAt === "string" && raw.deletedAt
        ? raw.deletedAt
        : raw.deletedAt === null
          ? null
          : undefined,
    crmSoftDeletedAt:
      typeof raw.crmSoftDeletedAt === "string" && raw.crmSoftDeletedAt.trim()
        ? raw.crmSoftDeletedAt
        : raw.crmSoftDeletedAt === null
          ? null
          : undefined,
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : undefined,
  };
}
