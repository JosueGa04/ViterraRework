import { addDays, endOfWeek, isSameDay, startOfDay, startOfWeek } from "date-fns";

export const AGENDA_STORAGE_KEY = "viterra_agenda_appointments";

/** Estados de la cita; el color en la rejilla se deriva solo del estado */
export type AgendaStatus = "pending" | "confirmed" | "completed" | "cancelled";

export const AGENDA_STATUS_LABEL: Record<AgendaStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};

export interface AgendaAppointment {
  id: string;
  /** Título corto (ej. tipo de cita) */
  title: string;
  start: string;
  end: string;
  status: AgendaStatus;
  clientName: string;
  staffName: string;
  staffId?: string;
}

export function newAgendaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ag_${crypto.randomUUID()}`;
  }
  return `ag_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Clases Tailwind por estado (color = estado) */
export const AGENDA_STATUS_STYLES: Record<
  AgendaStatus,
  { border: string; bg: string; ring: string }
> = {
  pending: {
    border: "border-amber-500",
    bg: "bg-amber-500/[0.12]",
    ring: "ring-amber-500/20",
  },
  confirmed: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/[0.12]",
    ring: "ring-emerald-500/20",
  },
  completed: {
    border: "border-sky-500",
    bg: "bg-sky-500/[0.12]",
    ring: "ring-sky-500/20",
  },
  cancelled: {
    border: "border-rose-500",
    bg: "bg-rose-500/[0.12]",
    ring: "ring-rose-500/20",
  },
};

export function weekRangeMonday(reference: Date): { start: Date; end: Date } {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  const end = endOfWeek(reference, { weekStartsOn: 1 });
  return { start, end };
}

export function parseAppointment(a: AgendaAppointment): { start: Date; end: Date } {
  return { start: new Date(a.start), end: new Date(a.end) };
}

/** Cita visible en la columna de ese día local (solape con el día) */
export function appointmentOverlapsDay(
  a: AgendaAppointment,
  day: Date,
): boolean {
  const { start, end } = parseAppointment(a);
  const d0 = startOfDay(day);
  const d1 = addDays(d0, 1);
  return start < d1 && end > d0;
}

export function filterAppointmentsForDay(
  list: AgendaAppointment[],
  day: Date,
): AgendaAppointment[] {
  return list.filter((a) => appointmentOverlapsDay(a, day));
}

/** Citas que intersectan el rango [weekStart, weekEnd) */
export function filterAppointmentsForWeek(
  list: AgendaAppointment[],
  weekStart: Date,
  weekEnd: Date,
): AgendaAppointment[] {
  return list.filter((a) => {
    const { start, end } = parseAppointment(a);
    return start < weekEnd && end > weekStart;
  });
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

/**
 * Genera citas de ejemplo alrededor de la semana que contiene `reference`.
 */
export function createDefaultAgendaAppointments(reference: Date): AgendaAppointment[] {
  const ws = startOfWeek(reference, { weekStartsOn: 1 });

  const slot = (dayIndex: number, h0: number, m0: number, h1: number, m1: number) => {
    const base = addDays(ws, dayIndex);
    const s = new Date(base);
    s.setHours(h0, m0, 0, 0);
    const e = new Date(base);
    e.setHours(h1, m1, 0, 0);
    return { start: s.toISOString(), end: e.toISOString() };
  };

  return [
    {
      id: "ag_seed_1",
      title: "Visita propiedad",
      ...slot(0, 9, 0, 10, 30),
      status: "confirmed",
      clientName: "María González",
      staffName: "Ana Ruiz",
    },
    {
      id: "ag_seed_2",
      title: "Seguimiento llamada",
      ...slot(1, 10, 0, 11, 0),
      status: "pending",
      clientName: "Carlos Méndez",
      staffName: "Luis Ortega",
    },
    {
      id: "ag_seed_3",
      title: "Firma de contrato",
      ...slot(2, 11, 30, 13, 0),
      status: "pending",
      clientName: "Lincoln Ekstrom",
      staffName: "James Cavaro",
    },
    {
      id: "ag_seed_4",
      title: "Tour desarrollo",
      ...slot(3, 14, 0, 15, 30),
      status: "confirmed",
      clientName: "Patricia Solís",
      staffName: "Ana Ruiz",
    },
    {
      id: "ag_seed_5",
      title: "Valoración",
      ...slot(4, 9, 30, 10, 45),
      status: "completed",
      clientName: "Roberto Núñez",
      staffName: "Luis Ortega",
    },
    {
      id: "ag_seed_6",
      title: "Reunión inversores",
      ...slot(0, 15, 0, 16, 0),
      status: "confirmed",
      clientName: "Grupo Norte",
      staffName: "Ana Ruiz",
    },
    {
      id: "ag_seed_7",
      title: "Cita virtual",
      ...slot(6, 10, 0, 10, 45),
      status: "cancelled",
      clientName: "Elena Vargas",
      staffName: "James Cavaro",
    },
  ];
}

function parseAgendaStatus(raw: unknown): AgendaStatus {
  if (
    raw === "pending" ||
    raw === "confirmed" ||
    raw === "completed" ||
    raw === "cancelled"
  ) {
    return raw;
  }
  return "pending";
}

export function normalizeStoredAgenda(raw: unknown): AgendaAppointment[] {
  if (!Array.isArray(raw)) return [];
  const out: AgendaAppointment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : newAgendaId();
    const title = typeof o.title === "string" ? o.title : "Cita";
    const start = typeof o.start === "string" ? o.start : new Date().toISOString();
    const end = typeof o.end === "string" ? o.end : new Date().toISOString();
    const status = parseAgendaStatus(o.status);
    const clientName = typeof o.clientName === "string" ? o.clientName : "";
    const staffName = typeof o.staffName === "string" ? o.staffName : "";
    const staffId = typeof o.staffId === "string" ? o.staffId : undefined;
    out.push({
      id,
      title,
      start,
      end,
      status,
      clientName,
      staffName,
      staffId,
    });
  }
  return out;
}
