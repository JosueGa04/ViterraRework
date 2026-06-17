import { lazy, Suspense, type ReactNode } from "react";
import { LayoutGrid, Settings, Users } from "lucide-react";
import type { AdminTab, CompanySubtab } from "../../pages/admin/adminNavigation";
import { AdminCompanySkeleton } from "../../pages/admin/AdminSectionSkeletons";
import { cn } from "../ui/utils";

const AdminSiteEditor = lazy(() =>
  import("./AdminSiteEditor").then((m) => ({ default: m.AdminSiteEditor }))
);

type Props = {
  isAdmin: boolean;
  isGroupLeader: boolean;
  companySubtab: CompanySubtab;
  companyModuleLoading: boolean;
  canEditSite: boolean;
  goTab: (tab: AdminTab, sub?: CompanySubtab) => void;
  adminModuleFallback: (className?: string) => ReactNode;
  /** Panel "Equipo y accesos" (AdminUsersManager) ya cableado en AdminWorkspace. */
  usersPanel: ReactNode;
  /** Panel "Configuración" (AdminCompanySettings) ya cableado en AdminWorkspace. */
  settingsPanel: ReactNode;
  /** Panel "Pipeline de ventas" (AdminPipelineStagesPanel) ya cableado en AdminWorkspace. */
  pipelinePanel: ReactNode;
};

/**
 * Contenedor de la pestaña Empresa: cabecera, selector de subtab y los cuatro paneles
 * (equipo / sitio / pipeline / configuración). Los paneles pesados se inyectan como slots
 * (`usersPanel` / `settingsPanel` / `pipelinePanel`) para no re-cablear sus props aquí; el
 * editor de sitio se monta localmente (lazy). Los paneles users/settings/leadStages se mantienen
 * SIEMPRE montados (hidden CSS) para evitar el reset de estado al cambiar de subtab.
 */
export function AdminCompanyContent({
  isAdmin,
  isGroupLeader,
  companySubtab,
  companyModuleLoading,
  canEditSite,
  goTab,
  adminModuleFallback,
  usersPanel,
  settingsPanel,
  pipelinePanel,
}: Props) {
  if (companyModuleLoading) {
    return <AdminCompanySkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="relative border-b border-slate-200 bg-transparent pb-8 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight text-slate-900 mb-2">
              {isGroupLeader ? "Pipeline de ventas" : "Mi Empresa"}
            </h2>
            <p className="text-sm text-slate-500 max-w-xl">
              {isGroupLeader
                ? "Gestiona tus grupos asignados y configura las columnas del pipeline de cada equipo."
                : isAdmin
                  ? "Equipo, sitio, embudo comercial y ajustes. Como administrador puedes abrir el pipeline de cada grupo y ajustar columnas, orden y colores."
                  : "Equipo, sitio, embudo comercial y ajustes del espacio de trabajo. Elige un área para continuar."}
            </p>
          </div>
        </div>
      </div>

      {!isGroupLeader && (
        <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
          {(
            [
              { id: "users"      as const, title: "Equipo y accesos",   icon: Users      },
              { id: "leadStages" as const, title: "Pipeline de ventas", icon: LayoutGrid },
              { id: "settings"   as const, title: "Configuración",      icon: Settings   },
            ] as const
          ).map((item) => {
            const active = companySubtab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTab("company", item.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
                style={{ fontWeight: active ? 600 : 500 }}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={active ? 2.2 : 1.75} />
                <span className="hidden sm:inline">{item.title}</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_-28px_rgba(20,28,46,0.14)] ring-1 ring-black/[0.03]">
        {/* Los paneles users / settings / leadStages se mantienen SIEMPRE montados
            (hidden CSS en lugar de &&) para evitar el reset de estado al cambiar tab. */}
        <div className={cn(companySubtab !== "users" && "hidden")}>
          {usersPanel}
        </div>
        {companySubtab === "site" && canEditSite && (
          <div className="flex h-[calc(100dvh-1.25rem)] max-h-[calc(100dvh-1.25rem)] min-h-0 w-full flex-col overflow-hidden p-2 sm:p-2.5 md:p-3 lg:h-[calc(100dvh-0.75rem)] lg:max-h-[calc(100dvh-0.75rem)]">
            <Suspense fallback={adminModuleFallback()}>
              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <AdminSiteEditor />
              </div>
            </Suspense>
          </div>
        )}
        <div className={cn(companySubtab !== "settings" && "hidden")}>
          {settingsPanel}
        </div>
        <div className={cn(companySubtab !== "leadStages" && "hidden")}>
          {pipelinePanel}
        </div>
      </section>
    </div>
  );
}
