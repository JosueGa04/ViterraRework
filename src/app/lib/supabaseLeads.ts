import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead, LeadClientNote, LeadActivityEntry } from "../data/leads";
import { normalizeLeadPipelineStatus, normalizeStoredLead } from "../data/leads";
import { DEFAULT_PIPELINE_GROUP_ID } from "./pipelineByGroup";

const nowIso = () => new Date().toISOString();

type LeadPayloadShape = {
  pipelineGroupId?: string;
  activity?: LeadActivityEntry[];
  clientNotes?: LeadClientNote[];
  relatedPropertyId?: string;
  relatedDevelopmentId?: string;
  /** Seteado solo al archivar desde el CRM (`softDeleteLead`); no usar `deleted_at` de Tokko como descartado. */
  crmSoftDeletedAt?: string;
  /** Orden manual dentro de su columna del Kanban (menor = más arriba). */
  sortOrder?: number;
};

function parsePayload(raw: unknown): LeadPayloadShape {
  if (!raw || typeof raw !== "object") return {};
  return raw as LeadPayloadShape;
}

function tsFromDateField(value: string): string {
  if (value.includes("T")) return new Date(value).toISOString();
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export function rowToLead(row: Record<string, unknown>): Lead {
  const payload = parsePayload(row.payload);
  return normalizeStoredLead({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    interest: (row.interest as Lead["interest"]) ?? "compra",
    propertyType: String(row.property_type ?? ""),
    budget: typeof row.budget === "number" ? row.budget : Number(row.budget) || 0,
    location: String(row.location ?? ""),
    status:
      typeof row.status === "string" && row.status.length > 0
        ? normalizeLeadPipelineStatus(row.status)
        : "nuevo",
    priorityStars: row.priority_stars as Lead["priorityStars"],
    source: String(row.source ?? ""),
    assignedTo: String(row.assigned_to ?? ""),
    assignedToUserId: String(row.assigned_to_user_id ?? ""),
    pipelineGroupId: payload.pipelineGroupId ?? DEFAULT_PIPELINE_GROUP_ID,
    clientNotes: payload.clientNotes,
    relatedPropertyId:
      typeof payload.relatedPropertyId === "string" ? payload.relatedPropertyId : undefined,
    relatedDevelopmentId:
      typeof payload.relatedDevelopmentId === "string" ? payload.relatedDevelopmentId : undefined,
    activity: payload.activity,
    createdAt: row.created_at ? String(row.created_at).split("T")[0] : undefined,
    createdAtIso: typeof row.created_at === "string" ? row.created_at : undefined,
    lastContact: row.last_contact ? String(row.last_contact).split("T")[0] : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    deletedAt:
      typeof row.deleted_at === "string"
        ? row.deleted_at
        : row.deleted_at === null
          ? null
          : undefined,
    crmSoftDeletedAt:
      typeof payload.crmSoftDeletedAt === "string" && payload.crmSoftDeletedAt.trim()
        ? payload.crmSoftDeletedAt
        : undefined,
    sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : undefined,
  } as Partial<Lead> & Record<string, unknown>);
}

function leadPayloadForDb(lead: Lead): Record<string, unknown> {
  const out: Record<string, unknown> = {
    pipelineGroupId: lead.pipelineGroupId,
    activity: lead.activity ?? [],
    clientNotes: lead.clientNotes ?? [],
    relatedPropertyId: lead.relatedPropertyId ?? null,
    relatedDevelopmentId: lead.relatedDevelopmentId ?? null,
  };
  if (lead.crmSoftDeletedAt != null && String(lead.crmSoftDeletedAt).trim() !== "") {
    out.crmSoftDeletedAt = lead.crmSoftDeletedAt;
  }
  if (typeof lead.sortOrder === "number" && Number.isFinite(lead.sortOrder)) {
    out.sortOrder = lead.sortOrder;
  }
  return out;
}

function leadToInsertRow(lead: Lead, ts: string) {
  const tokkoId = `manual_${lead.id}`;
  return {
    id: lead.id,
    tokko_id: tokkoId,
    name: lead.name,
    email: lead.email || null,
    phone: lead.phone || null,
    interest: lead.interest,
    property_type: lead.propertyType || null,
    budget: lead.budget,
    location: lead.location || null,
    status: lead.status,
    priority_stars: lead.priorityStars,
    source: lead.source || null,
    assigned_to: lead.assignedTo || null,
    assigned_to_user_id: lead.assignedToUserId || null,
    created_at: tsFromDateField(lead.createdAt),
    last_contact: tsFromDateField(lead.lastContact),
    payload: leadPayloadForDb(lead) as Record<string, unknown>,
    synced_at: ts,
    updated_at: ts,
    deleted_at: null,
    is_owner: null,
    is_company: null,
    work_name: null,
    work_email: null,
    work_position: null,
    document_number: null,
    cellphone: null,
    other_email: null,
    other_phone: null,
    tag_names: [] as string[],
    birthdate: null,
  };
}

export async function fetchActiveLeads(client: SupabaseClient) {
  /** Ver comentario en `fetchCatalogProperties`: filtro `deleted_at` omitido por datos Tokko. */
  const res = await client.from("leads").select("*").order("updated_at", { ascending: false });
  if (res.error) return { data: [] as Lead[], error: res.error };
  const rows = (res.data ?? []) as Record<string, unknown>[];
  return { data: rows.map(rowToLead), error: null };
}

/**
 * Devuelve todos los leads ordenados por fecha de creación descendente.
 * `deleted_at` en filas Tokko no implica “descartado en el CRM”; usar solo `payload.crmSoftDeletedAt`
 * (véase `softDeleteLead`) y `status === 'perdido'` en Consultas.
 */
export async function fetchAllLeadsForAdmin(client: SupabaseClient) {
  const res = await client.from("leads").select("*").order("created_at", { ascending: false });
  if (res.error) return { data: [] as Lead[], error: res.error };
  const rows = (res.data ?? []) as Record<string, unknown>[];
  return { data: rows.map(rowToLead), error: null };
}

export async function insertLead(client: SupabaseClient, lead: Lead) {
  const ts = nowIso();
  return client.from("leads").insert(leadToInsertRow(lead, ts));
}

/** Formulario público en ficha propiedad o desarrollo (`submit_catalog_lead` en Postgres; rol `anon`). */
export async function submitCatalogLeadViaRpc(
  client: SupabaseClient,
  args: {
    name: string;
    email: string;
    phone: string;
    message?: string;
    propertyId?: string | null;
    developmentId?: string | null;
  }
) {
  const msg = typeof args.message === "string" ? args.message.trim() : "";
  return client.rpc("submit_catalog_lead", {
    p_name: args.name.trim(),
    p_email: args.email.trim(),
    p_phone: args.phone.trim(),
    p_message: msg.length > 0 ? msg : null,
    p_property_id: args.propertyId ?? null,
    p_development_id: args.developmentId ?? null,
  });
}

/** Mensaje legible para errores de la RPC `submit_catalog_lead`. */
export function messageForCatalogLeadRpcError(raw: string): string {
  const k = raw.toLowerCase();
  if (k.includes("invalid_name")) return "Indica un nombre válido (2–200 caracteres).";
  if (k.includes("invalid_email")) return "Revisa que el correo electrónico sea válido.";
  if (k.includes("invalid_phone")) return "Indica un teléfono válido (8–40 caracteres).";
  if (k.includes("invalid_message")) return "El mensaje es demasiado largo.";
  if (k.includes("exactly_one_catalog_target")) return "Error interno al vincular la consulta. Recarga la página.";
  if (k.includes("property_not_found") || k.includes("development_not_found")) {
    return "Esta publicación ya no está disponible. Vuelve al listado e inténtalo de nuevo.";
  }
  return "No se pudo enviar la consulta. Intenta de nuevo en unos minutos o escríbenos por WhatsApp.";
}

export async function updateLead(client: SupabaseClient, lead: Lead) {
  const ts = nowIso();
  const row = {
    name: lead.name,
    email: lead.email || null,
    phone: lead.phone || null,
    interest: lead.interest,
    property_type: lead.propertyType || null,
    budget: lead.budget,
    location: lead.location || null,
    status: lead.status,
    priority_stars: lead.priorityStars,
    source: lead.source || null,
    assigned_to: lead.assignedTo || null,
    assigned_to_user_id: lead.assignedToUserId || null,
    last_contact: tsFromDateField(lead.lastContact),
    payload: leadPayloadForDb(lead) as Record<string, unknown>,
    synced_at: ts,
    updated_at: ts,
  };
  return client.from("leads").update(row).eq("id", lead.id);
}

/**
 * Persiste solo el orden manual del lead (`payload.sortOrder`) sin tocar `updated_at` ni el estado.
 * Se usa al reordenar tarjetas dentro de una columna del Kanban.
 */
export async function updateLeadOrder(client: SupabaseClient, lead: Lead) {
  return client
    .from("leads")
    .update({ payload: leadPayloadForDb(lead) as Record<string, unknown>, synced_at: nowIso() })
    .eq("id", lead.id);
}

/** Archiva el lead en panel: `deleted_at` + `payload.crmSoftDeletedAt` (fusiona con payload existente). */
export async function softDeleteLead(client: SupabaseClient, lead: Lead) {
  const ts = nowIso();
  const archived: Lead = { ...lead, crmSoftDeletedAt: ts, updatedAt: ts };
  const patch = leadPayloadForDb(archived) as Record<string, unknown>;

  const existing = await client.from("leads").select("payload").eq("id", lead.id).maybeSingle();
  const prevPayload =
    existing.data?.payload && typeof existing.data.payload === "object" && !Array.isArray(existing.data.payload)
      ? (existing.data.payload as Record<string, unknown>)
      : {};

  const payload = { ...prevPayload, ...patch };

  return client
    .from("leads")
    .update({ deleted_at: ts, updated_at: ts, synced_at: ts, payload })
    .eq("id", lead.id);
}
