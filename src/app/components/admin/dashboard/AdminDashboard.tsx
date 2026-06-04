import { useMemo } from "react";
import type { Lead } from "../../../data/leads";
import type { CustomKanbanStage } from "../../../data/leads";
import type { AgendaAppointment } from "../../../data/agenda";
import type { User } from "../../../contexts/AuthContext";
import type { Property } from "../../PropertyCard";
import {
  countClosedThisMonth,
  countUpcomingAppointments,
} from "../../../lib/dashboardOps";
import { createdThisMonth, leadsNeedingAttention } from "../../../lib/leadFunnel";
import { DashboardCatalogStatus } from "./DashboardCatalogStatus";
import { DashboardKpisCta } from "./DashboardKpisCta";
import { DashboardPipelineSnapshot } from "./DashboardPipelineSnapshot";
import { DashboardPrioritiesPanel } from "./DashboardPrioritiesPanel";
import { DashboardPulseRow, type PulseChip } from "./DashboardPulseRow";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { DashboardRecentLeads } from "./DashboardRecentLeads";
import { DashboardUpcomingAppointments } from "./DashboardUpcomingAppointments";
import { dashboardShell } from "./dashboardUi";

export type AdminDashboardProps = {
  leads: Lead[];
  properties: Property[];
  appointments: AgendaAppointment[];
  users: User[];
  customStages: CustomKanbanStage[];
  onNavigate: (tab: "leads" | "agenda" | "properties" | "kpis" | "company") => void;
  onNewLead: () => void;
  onOpenUsers: () => void;
};

export function AdminDashboard({
  leads,
  properties,
  appointments,
  users,
  customStages,
  onNavigate,
  onNewLead,
  onOpenUsers,
}: AdminDashboardProps) {
  const staleCount = useMemo(() => leadsNeedingAttention(leads, 7).length, [leads]);
  const weekAppointments = useMemo(() => countUpcomingAppointments(appointments), [appointments]);
  const closedMonth = useMemo(() => countClosedThisMonth(leads), [leads]);
  const newMonth = useMemo(() => leads.filter(createdThisMonth).length, [leads]);

  const pulseChips: PulseChip[] = useMemo(
    () => [
      {
        id: "stale",
        label: "Sin seguimiento",
        value: staleCount,
        hint: "Más de 7 días sin contacto",
        tone: staleCount > 0 ? "warn" : "neutral",
        onClick: () => onNavigate("leads"),
      },
      {
        id: "appointments",
        label: "Citas",
        value: weekAppointments,
        hint: "Esta semana",
        onClick: () => onNavigate("agenda"),
      },
      {
        id: "closed",
        label: "Cierres",
        value: closedMonth,
        hint: "Cerrados este mes",
        onClick: () => onNavigate("kpis"),
      },
      {
        id: "new",
        label: "Nuevas altas",
        value: newMonth,
        hint: "Registrados este mes",
        onClick: () => onNavigate("leads"),
      },
    ],
    [staleCount, weekAppointments, closedMonth, newMonth, onNavigate],
  );

  return (
    <div className={dashboardShell}>
      <DashboardPulseRow chips={pulseChips} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <DashboardPrioritiesPanel
            leads={leads}
            appointments={appointments}
            customStages={customStages}
            onOpenLeads={() => onNavigate("leads")}
            onOpenAgenda={() => onNavigate("agenda")}
          />
          <DashboardRecentLeads
            leads={leads}
            users={users}
            customStages={customStages}
            onOpenLeads={() => onNavigate("leads")}
          />
          <DashboardUpcomingAppointments
            appointments={appointments}
            onOpenAgenda={() => onNavigate("agenda")}
          />
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start">
          <DashboardPipelineSnapshot
            leads={leads}
            customStages={customStages}
            onOpenLeads={() => onNavigate("leads")}
          />
          <DashboardCatalogStatus properties={properties} onOpenProperties={() => onNavigate("properties")} />
          <DashboardKpisCta onOpenKpis={() => onNavigate("kpis")} />
          <DashboardQuickActions
            layout="stack"
            onNewLead={onNewLead}
            onOpenKpis={() => onNavigate("kpis")}
            onOpenProperties={() => onNavigate("properties")}
            onOpenUsers={onOpenUsers}
          />
        </aside>
      </div>
    </div>
  );
}
