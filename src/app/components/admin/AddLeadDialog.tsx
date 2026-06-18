import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import type { User } from "../../contexts/AuthContext";
import {
  labelForLeadStatus,
  newLeadClientNoteId,
  type CustomKanbanStage,
  type Lead,
  type LeadPriorityStars,
} from "../../data/leads";
import { LeadPriorityStarsInput } from "./LeadPriorityStarsInput";
import { CRM_ASSIGNEES, resolveAssigneeName } from "../../data/crmAssignees";
import { useAuth } from "../../contexts/AuthContext";
import { findDuplicateLeads, newLeadId } from "../../lib/leadDuplicates";
import { DEFAULT_PIPELINE_GROUP_ID } from "../../lib/pipelineByGroup";
import { foldSearchText } from "../../lib/searchText";
import type { Property } from "../PropertyCard";
import type { Development } from "../../data/developments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allLeads: Lead[];
  onAddLead: (lead: Lead) => void;
  user: User;
  customKanbanStages?: CustomKanbanStage[];
  /** Grupo de trabajo cuyo pipeline Kanban aplica a este lead */
  pipelineGroupId?: string;
  /** Primera columna activa del pipeline; obligatoria para crear leads. */
  defaultStageId?: string | null;
  /** Si se define, limita la asignación a estos IDs de usuario. */
  allowedAssigneeUserIds?: string[];
  properties: Property[];
  developments: Development[];
};

type AssigneeOption = {
  id: string;
  name: string;
  email?: string;
  role?: User["role"];
  tokkoUserId?: string;
  picture?: string;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  relatedPropertyId: "",
  relatedDevelopmentId: "",
  priorityStars: 3 as LeadPriorityStars,
  source: "CRM",
  notes: "",
};

const OTHER_SOURCE_VALUE = "__otro__";

const LEAD_SOURCE_OPTIONS = [
  "CRM",
  "Sitio web",
  "Formulario de contacto",
  "WhatsApp",
  "Llamada telefónica",
  "Correo electrónico",
  "Referido",
  "Cliente recurrente",
  "Facebook",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Google Ads",
  "Meta Ads",
  "Campaña de email",
  "Portal inmobiliario",
  "Inmuebles24",
  "Lamudi",
  "Propiedades.com",
  "Tokko Broker",
  "Open house",
  "Evento / feria",
  "Oficina",
  "Cartel / lona",
  "Prospección directa",
];

function levenshteinDistance(a: string, b: string, maxDistance = 2) {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length];
}

function scoreAssigneeMatch(name: string, query: string) {
  const foldedName = foldSearchText(name);
  const q = foldSearchText(query);
  if (!q) return 0;
  if (foldedName.includes(q)) return 0;

  const nameTokens = foldedName.split(/\s+/).filter(Boolean);
  const queryTokens = q.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return 0;

  let score = 0;
  for (const token of queryTokens) {
    const tokenMatches = nameTokens.some((nameToken) => {
      if (nameToken.includes(token) || nameToken.startsWith(token)) return true;
      const comparable = nameToken.slice(0, Math.max(token.length, Math.min(nameToken.length, token.length + 1)));
      return token.length >= 3 && levenshteinDistance(token, comparable, 2) <= 2;
    });

    if (!tokenMatches) return Number.POSITIVE_INFINITY;
    score += 1;
  }

  return score;
}

function roleLabel(role?: User["role"]) {
  if (role === "admin") return "Administrador";
  if (role === "lider_grupo") return "Líder de grupo";
  if (role === "asesor") return "Asesor";
  return "Asesor";
}

function formatCompactPrice(value: number | undefined) {
  if (!value || value <= 0) return "Precio no disponible";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function assigneeSearchHaystack(a: AssigneeOption) {
  return foldSearchText([a.name, a.email, a.id, a.tokkoUserId, roleLabel(a.role)].filter(Boolean).join(" "));
}

function propertySearchHaystack(p: Property) {
  return foldSearchText(
    [
      p.id,
      p.referenceCode,
      p.title,
      p.publicationTitle,
      p.location,
      p.colony,
      p.fullAddress,
      p.type,
      p.status,
      p.developmentTokkoId,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function developmentSearchHaystack(d: Development) {
  return foldSearchText([d.id, d.referenceCode, d.tokkoId, d.name, d.location, d.colony, d.type, d.status].filter(Boolean).join(" "));
}

export function AddLeadDialog({
  open,
  onOpenChange,
  allLeads,
  onAddLead,
  user,
  customKanbanStages = [],
  pipelineGroupId = DEFAULT_PIPELINE_GROUP_ID,
  defaultStageId = null,
  allowedAssigneeUserIds,
  properties,
  developments,
}: Props) {
  const { users: teamUsers } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [assigneeId, setAssigneeId] = useState(user.id);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [developmentSearch, setDevelopmentSearch] = useState("");
  const [sourcePreset, setSourcePreset] = useState("CRM");
  const [customSource, setCustomSource] = useState("");

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setAssigneeId(user.id);
      setAssigneeSearch("");
      setPropertySearch("");
      setDevelopmentSearch("");
      setSourcePreset("CRM");
      setCustomSource("");
    }
  }, [open, user.id]);

  const assigneeOptions = useMemo(() => {
    const fromTeam: AssigneeOption[] = teamUsers
      .filter((u) => u.isActive)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        tokkoUserId: u.tokkoUserId,
        picture: u.profile.picture,
      }));
    const list = fromTeam.length > 0 ? fromTeam : CRM_ASSIGNEES;
    const scopedList =
      allowedAssigneeUserIds && allowedAssigneeUserIds.length > 0
        ? list.filter((a) => allowedAssigneeUserIds.includes(a.id))
        : list;
    if (user.role === "asesor") {
      return scopedList.filter((a) => a.id === user.id);
    }
    return scopedList;
  }, [teamUsers, user.role, user.id, allowedAssigneeUserIds]);

  useEffect(() => {
    if (user.role === "asesor") {
      setAssigneeId(user.id);
    }
  }, [user.role, user.id]);

  useEffect(() => {
    if (assigneeOptions.length === 0) return;
    if (assigneeOptions.some((opt) => opt.id === assigneeId)) return;
    setAssigneeId(assigneeOptions[0].id);
  }, [assigneeOptions, assigneeId]);

  const duplicates = useMemo(
    () => findDuplicateLeads(allLeads, form.email, form.phone),
    [allLeads, form.email, form.phone]
  );
  const filteredAssigneeOptions = useMemo(() => {
    const q = foldSearchText(assigneeSearch);
    if (!q) return assigneeOptions;
    return assigneeOptions
      .map((a) => ({
        ...a,
        matchScore: assigneeSearchHaystack(a).includes(q) ? 0 : scoreAssigneeMatch(a.name, q),
      }))
      .filter((a) => Number.isFinite(a.matchScore))
      .sort((a, b) => a.matchScore - b.matchScore || a.name.localeCompare(b.name, "es"))
      .map(({ matchScore: _matchScore, ...a }) => a);
  }, [assigneeOptions, assigneeSearch]);
  const filteredPropertyOptions = useMemo(() => {
    const q = foldSearchText(propertySearch);
    if (!q) return properties;
    return properties.filter((p) => propertySearchHaystack(p).includes(q));
  }, [properties, propertySearch]);
  const filteredDevelopmentOptions = useMemo(() => {
    const q = foldSearchText(developmentSearch);
    if (!q) return developments;
    return developments.filter((d) => developmentSearchHaystack(d).includes(q));
  }, [developments, developmentSearch]);

  const propertyToDevelopmentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of properties) {
      const tokkoId = property.developmentTokkoId?.trim();
      if (!tokkoId) continue;
      const linkedDevelopment = developments.find((development) => development.tokkoId?.trim() === tokkoId);
      if (linkedDevelopment) map.set(property.id, linkedDevelopment.id);
    }
    return map;
  }, [properties, developments]);

  const hasDuplicate = duplicates.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultStageId) {
      toast.error("No hay etapa inicial configurada en el pipeline.");
      return;
    }
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !phone) {
      toast.error("Nombre y teléfono son obligatorios.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const relatedProperty =
      form.relatedPropertyId.trim().length > 0
        ? properties.find((p) => p.id === form.relatedPropertyId)
        : undefined;
    const relatedDevelopment =
      form.relatedDevelopmentId.trim().length > 0
        ? developments.find((d) => d.id === form.relatedDevelopmentId)
        : undefined;

    const noteText = form.notes.trim();
    const newLead: Lead = {
      id: newLeadId(),
      name,
      email,
      phone,
      interest: relatedProperty?.status === "alquiler" ? "alquiler" : "compra",
      propertyType: relatedProperty?.type || relatedDevelopment?.type || "—",
      budget: relatedProperty?.price ?? 0,
      location: relatedProperty?.location || relatedDevelopment?.location || "—",
      relatedPropertyId: relatedProperty?.id,
      relatedDevelopmentId: relatedDevelopment?.id,
      status: defaultStageId,
      priorityStars: form.priorityStars,
      source: form.source.trim() || "CRM",
      assignedTo: resolveAssigneeName(assigneeId, assigneeOptions),
      assignedToUserId: assigneeId,
      pipelineGroupId,
      clientNotes: noteText
        ? [{ id: newLeadClientNoteId(), date: today, body: noteText }]
        : [],
      createdAt: today,
      lastContact: today,
      updatedAt: new Date().toISOString(),
    };

    onAddLead(newLead);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!fixed !inset-0 !left-0 !top-0 z-50 flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-none duration-200 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 sm:!max-w-none"
      >
        <div className="h-1.5 shrink-0 bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-3.5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1480px] items-start justify-between gap-4">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="font-heading text-2xl tracking-tight text-brand-navy md:text-3xl" style={{ fontWeight: 700 }}>
                Nuevo lead
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
                Registra un cliente potencial. Si el correo o teléfono ya existen, te avisaremos para que confirmes la asignación.
              </DialogDescription>
            </DialogHeader>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="shrink-0 bg-white">
              Cerrar
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px] space-y-4">
          {!defaultStageId && (
            <div
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold" style={{ fontWeight: 600 }}>
                  No hay columnas configuradas
                </p>
                <p className="text-amber-900/90" style={{ fontWeight: 500 }}>
                  Crea al menos una columna en <strong>Mi empresa → Pipeline de ventas</strong> para poder registrar leads.
                </p>
              </div>
            </div>
          )}
          {hasDuplicate && (
            <div
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
              <div className="min-w-0 space-y-2">
                <p className="font-semibold" style={{ fontWeight: 600 }}>
                  Posible contacto duplicado
                </p>
                <p className="text-amber-900/90" style={{ fontWeight: 500 }}>
                  Ya hay {duplicates.length === 1 ? "un lead" : `${duplicates.length} leads`} con este correo o teléfono.
                  Revisa y asigna el responsable antes de guardar.
                </p>
                <ul className="list-inside list-disc space-y-1 text-xs text-amber-900/85" style={{ fontWeight: 500 }}>
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      {d.name} — {labelForLeadStatus(d.status, customKanbanStages)} — asignado a {d.assignedTo}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid min-w-0 items-start gap-4">
            <section className="order-1 min-w-0 self-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="space-y-0.5">
                <h3 className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                  1. Datos de contacto
                </h3>
                <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                  Información principal del cliente potencial.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="lead-name" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Nombre completo
                  </Label>
                  <input
                    id="lead-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ fontWeight: 500 }}
                    placeholder="Ej. María García"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-email" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Correo
                  </Label>
                  <input
                    id="lead-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ fontWeight: 500 }}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-phone" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Teléfono
                  </Label>
                  <input
                    id="lead-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ fontWeight: 500 }}
                    placeholder="+52 …"
                  />
                </div>
              </div>
            </section>

            <section className="order-3 min-w-0 space-y-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="space-y-0.5">
                <h3 className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                  3. Vinculación con inventario
                </h3>
                <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                  Relaciona el lead con una propiedad o desarrollo existente.
                </p>
              </div>
              <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-property" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Asignar propiedad
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                    <input
                      type="search"
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      placeholder="Buscar propiedad por nombre, referencia o ID…"
                    className="mb-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div id="lead-property" className="max-h-[30rem] min-w-0 space-y-3 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, relatedPropertyId: "", relatedDevelopmentId: "" }))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        !form.relatedPropertyId
                          ? "border-primary/70 bg-white text-brand-navy shadow-sm ring-2 ring-primary/15"
                          : "border-slate-200/70 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      Sin propiedad
                    </button>
                    {filteredPropertyOptions.slice(0, 30).map((p) => {
                      const selected = form.relatedPropertyId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const linkedDevelopmentId = propertyToDevelopmentId.get(p.id);
                            setForm((f) => ({
                              ...f,
                              relatedPropertyId: p.id,
                              relatedDevelopmentId: linkedDevelopmentId ?? "",
                            }));
                          }}
                          className={`flex min-w-0 w-full gap-4 rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-primary/70 bg-white shadow-sm ring-2 ring-primary/15"
                              : "border-slate-200/70 bg-white/80 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <img
                            src={p.image}
                            alt=""
                            className="h-24 w-32 shrink-0 rounded-xl object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-3 text-base leading-snug text-brand-navy" style={{ fontWeight: 700 }}>
                                {p.publicationTitle?.trim() || p.title}
                              </p>
                              {selected ? (
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary" style={{ fontWeight: 700 }}>
                                  Seleccionada
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-600" style={{ fontWeight: 600 }}>
                              {formatCompactPrice(p.price)} · {p.status === "alquiler" ? "Renta" : "Venta"}
                            </p>
                            <p className="mt-1.5 text-xs text-slate-500" style={{ fontWeight: 500 }}>
                              {p.location}{p.colony ? ` · ${p.colony}` : ""}
                            </p>
                            <p className="mt-1 break-all text-[10px] uppercase tracking-wide text-slate-400" style={{ fontWeight: 600 }}>
                              Ref. {p.referenceCode || "—"} · ID {p.id}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {filteredPropertyOptions.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No se encontraron propiedades para esa búsqueda.</p>
                  ) : null}
                  {filteredPropertyOptions.length > 30 ? (
                    <p className="mt-2 text-xs text-slate-500">Mostrando 30 resultados. Afina la búsqueda por nombre, referencia o ID.</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-development" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Asignar desarrollo
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                    <input
                      type="search"
                      value={developmentSearch}
                      onChange={(e) => setDevelopmentSearch(e.target.value)}
                      placeholder="Buscar desarrollo por nombre, referencia o ID…"
                    className="mb-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div id="lead-development" className="max-h-[30rem] min-w-0 space-y-3 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, relatedDevelopmentId: "" }))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        !form.relatedDevelopmentId
                          ? "border-primary/70 bg-white text-brand-navy shadow-sm ring-2 ring-primary/15"
                          : "border-slate-200/70 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      Sin desarrollo
                    </button>
                    {filteredDevelopmentOptions.slice(0, 30).map((d) => {
                      const selected = form.relatedDevelopmentId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, relatedDevelopmentId: d.id }))}
                          className={`flex min-w-0 w-full gap-4 rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-primary/70 bg-white shadow-sm ring-2 ring-primary/15"
                              : "border-slate-200/70 bg-white/80 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <img
                            src={d.image}
                            alt=""
                            className="h-24 w-32 shrink-0 rounded-xl object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-3 text-base leading-snug text-brand-navy" style={{ fontWeight: 700 }}>
                                {d.name}
                              </p>
                              {selected ? (
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary" style={{ fontWeight: 700 }}>
                                  Seleccionado
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-600" style={{ fontWeight: 600 }}>
                              {d.priceRange || "Precio no disponible"} · {d.status}
                            </p>
                            <p className="mt-1.5 text-xs text-slate-500" style={{ fontWeight: 500 }}>
                              {d.location}{d.colony ? ` · ${d.colony}` : ""}
                            </p>
                            <p className="mt-1 break-all text-[10px] uppercase tracking-wide text-slate-400" style={{ fontWeight: 600 }}>
                              Ref. {d.referenceCode || "—"} · ID {d.tokkoId || d.id}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {filteredDevelopmentOptions.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No se encontraron desarrollos para esa búsqueda.</p>
                  ) : null}
                  {filteredDevelopmentOptions.length > 30 ? (
                    <p className="mt-2 text-xs text-slate-500">Mostrando 30 resultados. Afina la búsqueda por nombre, referencia o ID.</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="order-2 min-w-0 self-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="space-y-0.5">
                <h3 className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                  2. Seguimiento comercial
                </h3>
                <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                  Define prioridad, origen y responsable del lead.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Prioridad (1–6 estrellas)
                  </Label>
                  <LeadPriorityStarsInput
                    value={form.priorityStars}
                    onChange={(v) => setForm((f) => ({ ...f, priorityStars: v }))}
                    size="md"
                  />
                  <p className="text-[11px] leading-relaxed text-slate-500" style={{ fontWeight: 500 }}>
                    Más estrellas indican mayor prioridad para el seguimiento.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-source" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Origen
                  </Label>
                  <select
                    id="lead-source"
                    value={sourcePreset}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSourcePreset(value);
                      if (value === OTHER_SOURCE_VALUE) {
                        setForm((f) => ({ ...f, source: customSource }));
                      } else {
                        setForm((f) => ({ ...f, source: value }));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ fontWeight: 500 }}
                  >
                    {LEAD_SOURCE_OPTIONS.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                    <option value={OTHER_SOURCE_VALUE}>Otro</option>
                  </select>
                  {sourcePreset === OTHER_SOURCE_VALUE ? (
                    <input
                      value={customSource}
                      onChange={(e) => {
                        setCustomSource(e.target.value);
                        setForm((f) => ({ ...f, source: e.target.value }));
                      }}
                      className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      style={{ fontWeight: 500 }}
                      placeholder="Escribe el origen del lead…"
                    />
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="lead-assignee"
                    className={`text-xs uppercase tracking-wide ${hasDuplicate ? "text-amber-800" : "text-slate-600"}`}
                    style={{ fontWeight: 600 }}
                  >
                    Asignar a {hasDuplicate ? "(confirma por el posible duplicado)" : ""}
                  </Label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                    />
                    <input
                      type="search"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Buscar asesor…"
                      className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div id="lead-assignee" className="max-h-72 min-w-0 space-y-2.5 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                    {filteredAssigneeOptions.map((a) => {
                      const selected = assigneeId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          disabled={user.role === "asesor"}
                          onClick={() => setAssigneeId(a.id)}
                          className={`flex min-w-0 w-full items-center gap-3.5 rounded-xl border px-3.5 py-3 text-left transition ${
                            selected
                              ? "border-primary/70 bg-white shadow-sm ring-2 ring-primary/15"
                              : "border-slate-200/70 bg-white/80 hover:border-slate-300 hover:bg-white"
                          } disabled:cursor-not-allowed disabled:opacity-75`}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-navy text-sm font-semibold text-white">
                            {a.picture ? (
                              <img src={a.picture} alt="" className="h-full w-full object-cover" />
                            ) : (
                              a.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                              {a.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500" style={{ fontWeight: 500 }}>
                              {roleLabel(a.role)} · ID {a.tokkoUserId || a.id}
                              {a.email ? ` · ${a.email}` : ""}
                            </p>
                          </div>
                          {selected ? (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-wide text-primary" style={{ fontWeight: 700 }}>
                              Seleccionado
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {filteredAssigneeOptions.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">No se encontraron asesores para esa búsqueda.</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="lead-notes" className="text-xs uppercase tracking-wide text-slate-600" style={{ fontWeight: 600 }}>
                    Notas
                  </Label>
                  <textarea
                    id="lead-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full resize-y rounded-xl border border-slate-200/90 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ fontWeight: 500 }}
                    placeholder="Detalle del interés del cliente…"
                  />
                </div>
              </div>
            </section>

          </div>

          </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200/80 bg-white/95 px-5 py-3 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur sm:justify-end lg:px-8">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!defaultStageId}
              className="bg-primary hover:bg-brand-red-hover text-primary-foreground"
            >
              Guardar lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
