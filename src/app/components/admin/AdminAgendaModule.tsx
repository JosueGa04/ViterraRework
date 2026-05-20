import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  differenceInMinutes,
  format,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  TrendingUp,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import type { User as AuthUser } from "../../contexts/AuthContext";
import type { UserGroup } from "../../lib/userGroups";
import {
  AGENDA_STATUS_LABEL,
  AGENDA_STATUS_STYLES,
  AGENDA_STORAGE_KEY,
  type AgendaAppointment,
  type AgendaStatus,
  createDefaultAgendaAppointments,
  filterAppointmentsForWeek,
  newAgendaId,
  normalizeStoredAgenda,
  parseAppointment,
} from "../../data/agenda";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";

const START_HOUR = 8;
const END_HOUR_EXCLUSIVE = 20;
const PX_PER_HOUR = 52;
const HOUR_COUNT = END_HOUR_EXCLUSIVE - START_HOUR;

function layoutBlock(
  apt: AgendaAppointment,
  day: Date,
): { topPct: number; heightPct: number } | null {
  const { start, end } = parseAppointment(apt);
  if (!start || !end || end <= start) return null;
  const sod = startOfDay(day);
  const visStart = setMinutes(setHours(sod, START_HOUR), 0);
  const visEnd = setMinutes(setHours(sod, END_HOUR_EXCLUSIVE), 0);
  const s = start > visStart ? start : visStart;
  const e = end < visEnd ? end : visEnd;
  if (e <= s) return null;
  const totalMin = differenceInMinutes(visEnd, visStart);
  const topMin = differenceInMinutes(s, visStart);
  const durMin = differenceInMinutes(e, s);
  return {
    topPct: (topMin / totalMin) * 100,
    heightPct: Math.max((durMin / totalMin) * 100, 8),
  };
}

export function AdminAgendaModule({
  currentUser,
  users = [],
  userGroups = [],
  onAppointmentsChange,
}: {
  currentUser: AuthUser | null;
  users?: AuthUser[];
  userGroups?: UserGroup[];
  onAppointmentsChange?: (appts: AgendaAppointment[]) => void;
}) {
  const [appointments, setAppointments] = useState<AgendaAppointment[]>(() => {
    try {
      const raw = localStorage.getItem(AGENDA_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeStoredAgenda(JSON.parse(raw));
        if (parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return createDefaultAgendaAppointments(new Date());
  });

  useEffect(() => {
    try {
      localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(appointments));
      onAppointmentsChange?.(appointments);
    } catch {
      /* ignore */
    }
  }, [appointments, onAppointmentsChange]);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  // Filtros de rol
  const isAdvisor = currentUser?.role === "asesor";
  const isGroupLeader = currentUser?.role === "lider_grupo";
  const isAdmin = currentUser?.role === "admin";

  // Encontrar asesores asignados para líderes o admins
  const assignedAdvisors = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) {
      return users.filter((u) => u.role === "asesor" && u.isActive);
    }
    if (isGroupLeader) {
      const leaderGroups = userGroups.filter((g) => g.leaderId === currentUser.id);
      const assignedMemberIds = new Set(leaderGroups.flatMap((g) => g.memberIds));
      return users.filter((u) => assignedMemberIds.has(u.id) && u.role === "asesor");
    }
    return [];
  }, [currentUser, users, userGroups, isAdmin, isGroupLeader]);

  // Filtro activo de asesor seleccionado para el calendario
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formClient, setFormClient] = useState("");
  const [formStaff, setFormStaff] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formStatus, setFormStatus] = useState<AgendaStatus>("pending");

  const openAdd = useCallback(() => {
    const d = new Date();
    setFormTitle("Nueva cita");
    setFormDate(format(d, "yyyy-MM-dd"));
    setFormStart("09:00");
    setFormEnd("10:00");
    setFormClient("");
    
    if (currentUser?.role === "asesor") {
      setFormStaff(currentUser.name);
      setFormStaffId(currentUser.id);
    } else {
      setFormStaff(currentUser?.name || "");
      setFormStaffId(currentUser?.id || "");
    }
    
    setFormStatus("pending");
    setAddOpen(true);
  }, [currentUser]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const rangeStart = useMemo(
    () => startOfWeek(weekStart, { weekStartsOn: 1 }),
    [weekStart],
  );
  const weekEndExclusive = useMemo(() => addDays(rangeStart, 7), [rangeStart]);

  const weekAppointments = useMemo(
    () => filterAppointmentsForWeek(appointments, rangeStart, weekEndExclusive),
    [appointments, rangeStart, weekEndExclusive],
  );

  // Filtrar citas según permisos y asesor seleccionado
  const filteredAppointmentsForView = useMemo(() => {
    return weekAppointments.filter((a) => {
      // 1. Si es Asesor, forzar que solo vea su propia agenda
      if (isAdvisor && currentUser) {
        if (a.staffId) return a.staffId === currentUser.id;
        return a.staffName.toLowerCase() === currentUser.name.toLowerCase();
      }

      // 2. Si es Líder o Admin y tiene un asesor específico seleccionado en el filtro
      if (selectedStaffFilter !== "all") {
        if (a.staffId) return a.staffId === selectedStaffFilter;
        // Compatibilidad por nombre
        const matchedUser = users.find((u) => u.id === selectedStaffFilter);
        return matchedUser ? a.staffName.toLowerCase() === matchedUser.name.toLowerCase() : false;
      }

      // 3. Si es Líder y tiene "Todo mi equipo", mostrar citas del líder + sus asesores asignados
      if (isGroupLeader && currentUser) {
        const allowedIds = [currentUser.id, ...assignedAdvisors.map((u) => u.id)];
        const allowedNames = [currentUser.name, ...assignedAdvisors.map((u) => u.name)].map((n) =>
          n.toLowerCase()
        );
        if (a.staffId) return allowedIds.includes(a.staffId);
        return allowedNames.includes(a.staffName.toLowerCase());
      }

      // 4. Admin en "Todo el equipo" ve todo
      return true;
    });
  }, [weekAppointments, isAdvisor, currentUser, selectedStaffFilter, isGroupLeader, assignedAdvisors, users]);

  const titleWeek = format(weekStart, "MMMM yyyy", { locale: es });

  const goPrevWeek = () => setWeekStart((w) => addDays(w, -7));
  const goNextWeek = () => setWeekStart((w) => addDays(w, 7));

  const openDetail = (a: AgendaAppointment) => {
    setSelected(a);
    setDetailOpen(true);
  };

  const patchAppointmentStatus = useCallback((id: string, status: AgendaStatus) => {
    setAppointments((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  }, []);

  const saveNew = () => {
    if (!formTitle.trim() || !formDate || !formClient.trim()) return;
    const [y, mo, da] = formDate.split("-").map(Number);
    const [sh, sm] = formStart.split(":").map(Number);
    const [eh, em] = formEnd.split(":").map(Number);
    const s = new Date(y!, mo! - 1, da!, sh ?? 9, sm ?? 0, 0, 0);
    const e = new Date(y!, mo! - 1, da!, eh ?? 10, em ?? 0, 0, 0);
    if (e <= s) return;
    const next: AgendaAppointment = {
      id: newAgendaId(),
      title: formTitle.trim(),
      start: s.toISOString(),
      end: e.toISOString(),
      status: formStatus,
      clientName: formClient.trim(),
      staffName: formStaff.trim() || "—",
      staffId: formStaffId || undefined,
    };
    setAppointments((prev) => [...prev, next]);
    setAddOpen(false);
  };

  const gridHeightPx = HOUR_COUNT * PX_PER_HOUR;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div
          className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
              style={{ fontWeight: 600 }}
            >
              CRM
            </p>
            <h1 className="font-heading mt-1.5 text-2xl tracking-tight text-brand-navy sm:text-3xl" style={{ fontWeight: 700 }}>
              Agenda
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
              Citas y seguimientos en vista semanal. Crea una cita nueva cuando la necesites.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
            {(isGroupLeader || isAdmin) && (
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
                  Ver agenda de:
                </span>
                <Select
                  value={selectedStaffFilter}
                  onValueChange={setSelectedStaffFilter}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200/90 text-slate-800 text-xs shadow-sm focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Seleccionar asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {isGroupLeader ? "Todo mi equipo" : "Todo el equipo"}
                    </SelectItem>
                    {currentUser && (
                      <SelectItem value={currentUser.id}>
                        Mi agenda personal
                      </SelectItem>
                    )}
                    {assignedAdvisors.map((adv) => (
                      <SelectItem key={adv.id} value={adv.id}>
                        {adv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              type="button"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto font-semibold"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nueva cita
            </Button>
          </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200/80 pb-4 sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 border-slate-200"
          onClick={goPrevWeek}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p
          className="min-w-0 flex-1 text-center font-heading text-lg capitalize text-brand-navy sm:flex-none sm:text-xl"
          style={{ fontWeight: 700 }}
        >
          {titleWeek}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 border-slate-200"
          onClick={goNextWeek}
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-[720px]">
            <div className="flex w-[3.25rem] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 sm:w-14">
              <div className="flex min-h-[4.5rem] items-center justify-center border-b border-slate-200 px-0.5">
                <CalendarIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
              </div>
              <div
                className="flex flex-col"
                style={{ height: gridHeightPx }}
                aria-hidden
              >
                {Array.from({ length: HOUR_COUNT }, (_, idx) => START_HOUR + idx).map((h) => (
                  <div
                    key={h}
                    className="flex shrink-0 items-start justify-end border-b border-slate-100 pr-1.5 pt-1.5"
                    style={{ height: PX_PER_HOUR, minHeight: PX_PER_HOUR }}
                  >
                    <span className="select-none text-[11px] leading-none tabular-nums text-slate-500">
                      {String(h).padStart(2, "0")}.00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-7 border-b border-slate-200">
                {weekDays.map((d) => {
                  const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  return (
                    <div
                      key={d.toISOString()}
                      className="flex min-h-[4.5rem] flex-col justify-center border-l border-slate-100 px-1 py-2 text-center first:border-l-0"
                    >
                      <p
                        className={cn(
                          "text-[11px] font-medium uppercase tracking-wide",
                          isToday ? "text-primary" : "text-slate-500",
                        )}
                        style={{ fontWeight: 600 }}
                      >
                        {format(d, "EEE", { locale: es })}
                      </p>
                      <p
                        className={cn(
                          "text-sm",
                          isToday
                            ? "font-semibold text-primary"
                            : "font-medium text-slate-900",
                        )}
                        style={{ fontWeight: isToday ? 700 : 600 }}
                      >
                        {format(d, "d.MM", { locale: es })}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7">
                {weekDays.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayEvents = filteredAppointmentsForView.filter((a) => {
                    const { start } = parseAppointment(a);
                    return format(start, "yyyy-MM-dd") === dayKey;
                  });

                  return (
                    <div
                      key={dayKey}
                      className="relative border-l border-slate-100 first:border-l-0"
                      style={{ height: gridHeightPx }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 flex flex-col"
                        aria-hidden
                      >
                        {Array.from({ length: HOUR_COUNT }, (_, i) => (
                          <div
                            key={i}
                            className="border-b border-slate-100"
                            style={{
                              height: PX_PER_HOUR,
                              backgroundImage:
                                "linear-gradient(to bottom, transparent 49%, rgba(148,163,184,0.12) 50%, transparent 51%)",
                              backgroundSize: "100% 50%",
                            }}
                          />
                        ))}
                      </div>

                      {dayEvents.map((a) => {
                        const layout = layoutBlock(a, day);
                        if (!layout) return null;
                        const styles = AGENDA_STATUS_STYLES[a.status];
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => openDetail(a)}
                            className={cn(
                              "absolute left-0.5 right-0.5 z-[1] overflow-hidden rounded-md border border-slate-200/60 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40",
                              styles.bg,
                              styles.border,
                              styles.ring,
                            )}
                            style={{
                              top: `${layout.topPct}%`,
                              height: `${layout.heightPct}%`,
                              borderTopWidth: 4,
                            }}
                          >
                            <div className="flex h-full min-h-[36px] flex-col p-1.5">
                              <span className="line-clamp-1 text-[11px] font-semibold leading-tight text-slate-900">
                                {a.clientName.trim() || "Sin cliente"}
                              </span>
                              <span className="line-clamp-2 text-[10px] font-medium leading-tight text-slate-600">
                                {a.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left font-heading text-lg text-brand-navy">
                  {selected.clientName}
                </DialogTitle>
                <DialogDescription className="text-left text-sm text-slate-600">
                  {selected.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="space-y-2">
                  <Label htmlFor="ag-detail-status">Estado</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(v) =>
                      patchAppointmentStatus(selected.id, v as AgendaStatus)
                    }
                  >
                    <SelectTrigger id="ag-detail-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AGENDA_STATUS_LABEL) as AgendaStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {AGENDA_STATUS_LABEL[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 text-slate-700">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span style={{ fontWeight: 500 }}>
                    {format(parseAppointment(selected).start, "d MMM yyyy", {
                      locale: es,
                    })}{" "}
                    {format(parseAppointment(selected).start, "HH.mm")} –{" "}
                    {format(parseAppointment(selected).end, "HH.mm")}
                  </span>
                </div>
                <div className="flex gap-2 text-slate-700">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span style={{ fontWeight: 500 }}>{selected.staffName}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="font-heading text-brand-navy">Nueva cita</DialogTitle>
            <DialogDescription>
              Completa los datos. La cita aparecerá en la agenda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ag-title">Título / tipo</Label>
              <Input
                id="ag-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej. Visita propiedad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-date">Fecha</Label>
              <Input
                id="ag-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ag-start">Inicio</Label>
                <Input
                  id="ag-start"
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ag-end">Fin</Label>
                <Input
                  id="ag-end"
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-client">Cliente</Label>
              <Input
                id="ag-client"
                value={formClient}
                onChange={(e) => setFormClient(e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-staff">Asesor</Label>
              {isAdvisor ? (
                <Input
                  id="ag-staff"
                  value={formStaff}
                  disabled
                  className="bg-slate-50 cursor-not-allowed border-slate-200 text-slate-500 font-medium"
                />
              ) : (
                <Select
                  value={formStaffId}
                  onValueChange={(v) => {
                    setFormStaffId(v);
                    const matched = users.find((u) => u.id === v);
                    if (matched) {
                      setFormStaff(matched.name);
                    } else if (currentUser && currentUser.id === v) {
                      setFormStaff(currentUser.name);
                    }
                  }}
                >
                  <SelectTrigger id="ag-staff">
                    <SelectValue placeholder="Seleccionar asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser && (
                      <SelectItem value={currentUser.id}>
                        {currentUser.name} (Tú)
                      </SelectItem>
                    )}
                    {assignedAdvisors.map((adv) => (
                      <SelectItem key={adv.id} value={adv.id}>
                        {adv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-status">Estado</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as AgendaStatus)}
              >
                <SelectTrigger id="ag-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AGENDA_STATUS_LABEL) as AgendaStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {AGENDA_STATUS_LABEL[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveNew} className="bg-primary text-primary-foreground">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de control y estadísticas para líderes de grupo y administradores */}
      {(isGroupLeader || isAdmin) && assignedAdvisors.length > 0 && (() => {
        // Cálculo de estadísticas
        const stats = assignedAdvisors.map((adv) => {
          const advAppointments = appointments.filter((a) => {
            if (a.staffId) return a.staffId === adv.id;
            return a.staffName.toLowerCase() === adv.name.toLowerCase();
          });

          const total = advAppointments.length;
          const completed = advAppointments.filter((a) => a.status === "completed").length;
          const confirmed = advAppointments.filter((a) => a.status === "confirmed").length;
          const pending = advAppointments.filter((a) => a.status === "pending").length;
          const cancelled = advAppointments.filter((a) => a.status === "cancelled").length;
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            advisor: adv,
            total,
            completed,
            confirmed,
            pending,
            cancelled,
            completionRate,
          };
        });

        return (
          <div className="mt-8 space-y-5">
            <header className="flex flex-col gap-1.5 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <BarChart3 className="h-5 w-5" strokeWidth={2} />
                <h2 className="font-heading text-lg tracking-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  Control y Estadísticas de Citas del Equipo
                </h2>
              </div>
              <p className="text-xs text-slate-600" style={{ fontWeight: 500 }}>
                Visualización en tiempo real del conteo, rendimiento y estatus de citas programadas por tus asesores asignados.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stats.map((stat) => {
                const initials = stat.advisor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={stat.advisor.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(20,28,46,0.06)] transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(20,28,46,0.12)] hover:border-slate-300/90 group"
                  >
                    {/* Indicador superior de progreso */}
                    <div
                      className="absolute top-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${stat.completionRate}%` }}
                      aria-hidden
                    />
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading text-sm text-brand-navy truncate" style={{ fontWeight: 600 }}>
                            {stat.advisor.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate" style={{ fontWeight: 500 }}>
                            {stat.advisor.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStaffFilter(stat.advisor.id)}
                        className="text-[11px] font-semibold text-primary hover:text-primary/90 hover:bg-primary/5 px-2.5 h-7 transition-colors rounded-lg shrink-0"
                      >
                        Ver agenda
                      </Button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50/80 rounded-xl p-3 border border-slate-100/70">
                      <div className="text-center">
                        <p className="text-[9px] uppercase font-semibold tracking-wider text-slate-500">
                          Citas Totales
                        </p>
                        <p className="text-lg font-bold text-brand-navy mt-0.5 tabular-nums">
                          {stat.total}
                        </p>
                      </div>
                      <div className="text-center border-l border-slate-200">
                        <p className="text-[9px] uppercase font-semibold tracking-wider text-slate-500">
                          Completadas
                        </p>
                        <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">
                          {stat.completed}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="text-[11px]">Tasa de finalización</span>
                        <span className="text-slate-900 tabular-nums text-[11px]">{stat.completionRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${stat.completionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/[0.08] text-emerald-700 border border-emerald-500/10">
                        Confirmadas: {stat.confirmed}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/[0.08] text-amber-700 border border-amber-500/10">
                        Pendientes: {stat.pending}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/[0.08] text-rose-700 border border-rose-500/10">
                        Canceladas: {stat.cancelled}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
