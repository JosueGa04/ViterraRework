import { useCallback, useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Calendar,
  Database,
  Globe2,
  Home,
  LayoutGrid,
  Mail,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import {
  CRM_LOCAL_STORAGE_KEYS,
  DEFAULT_WORKSPACE_ADMIN_SETTINGS,
  type WorkspaceAdminSettings,
  loadWorkspaceAdminSettings,
  saveWorkspaceAdminSettings,
} from "../../data/workspaceSettings";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type CompanyNavigateSpec =
  | { type: "tab"; tab: "dashboard" | "leads" | "properties" | "developments" | "agenda" | "company" | "messages" | "sitio" }
  | { type: "company"; sub: "users" | "site" | "leadStages" | "settings" };

interface Props {
  counts: {
    leads: number;
    properties: number;
    developments: number;
    users: number;
    agenda: number;
  };
  onNavigate: (spec: CompanyNavigateSpec) => void;
}

export function AdminCompanySettings({ counts, onNavigate }: Props) {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<WorkspaceAdminSettings>(() => loadWorkspaceAdminSettings());

  const saveWorkspaceFields = useCallback(() => {
    saveWorkspaceAdminSettings(settings);
    toast.success("Datos del espacio guardados");
  }, [settings]);

  const storageBytes = useMemo(() => {
    let total = 0;
    for (const { key } of CRM_LOCAL_STORAGE_KEYS) {
      try {
        const v = localStorage.getItem(key);
        if (v) total += v.length * 2;
      } catch {
        /* ignore */
      }
    }
    return total;
  }, [settings]);

  const isAdvisor = user?.role === "asesor";
  const isAdmin = user?.role === "admin";
  const canEditSite = Boolean(
    user && !isAdvisor && (isAdmin || user.permissions.includes("edit_site")),
  );

  const quickLinks: Array<{
    label: string;
    spec: CompanyNavigateSpec;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = useMemo(
    () => [
      { label: "Leads", spec: { type: "tab", tab: "leads" }, icon: Users },
      { label: "Propiedades", spec: { type: "tab", tab: "properties" }, icon: Home },
      { label: "Desarrollos", spec: { type: "tab", tab: "developments" }, icon: Globe2 },
      { label: "Agenda", spec: { type: "tab", tab: "agenda" }, icon: Calendar },
      { label: "Usuarios", spec: { type: "company", sub: "users" }, icon: Shield },
      ...(canEditSite ? ([{ label: "Sitio web", spec: { type: "tab", tab: "sitio" } as const, icon: Globe2 }] as const) : []),
      { label: "Pipeline", spec: { type: "company", sub: "leadStages" }, icon: LayoutGrid },
    ],
    [canEditSite],
  );

  return (
    <div className="flex flex-col gap-8 p-5 md:p-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary" style={{ fontWeight: 600 }}>
          Mi empresa
        </p>
        <h3 className="font-heading mt-1 text-2xl text-brand-navy" style={{ fontWeight: 600 }}>
          Configuración
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600" style={{ fontWeight: 500 }}>
          Ajustes del espacio de trabajo y resumen de datos locales. Todo se guarda en este navegador (localStorage).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 md:p-6">
        <h4 className="flex items-center gap-2 text-base text-brand-navy" style={{ fontWeight: 600 }}>
          <Settings className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Espacio de trabajo
        </h4>
        <p className="mt-1 text-sm text-slate-600" style={{ fontWeight: 500 }}>
          Identificador y preferencias que se usan como referencia en exportaciones y nuevas altas.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Nombre del espacio</Label>
            <Input
              id="ws-name"
              value={settings.workspaceName}
              onChange={(e) => setSettings((s) => ({ ...s, workspaceName: e.target.value }))}
              placeholder="Ej. Viterra Inmobiliaria"
            />
          </div>
          <div className="space-y-2">
            <Label>Moneda por defecto</Label>
            <Select
              value={settings.defaultCurrency}
              onValueChange={(v) => {
                const next = { ...settings, defaultCurrency: v as "MXN" | "USD" };
                setSettings(next);
                saveWorkspaceAdminSettings(next);
                toast.success("Moneda por defecto actualizada");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MXN">MXN — Peso mexicano</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ws-email">Correo de contacto interno (opcional)</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <Input
                id="ws-email"
                type="email"
                className="pl-10"
                value={settings.contactEmail}
                onChange={(e) => setSettings((s) => ({ ...s, contactEmail: e.target.value }))}
                placeholder="admin@empresa.com"
              />
            </div>
          </div>
        </div>
        <Button type="button" variant="secondary" className="mt-5" onClick={saveWorkspaceFields}>
          Guardar datos del espacio
        </Button>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
        <h4 className="flex items-center gap-2 text-base text-brand-navy" style={{ fontWeight: 600 }}>
          <Database className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Resumen del CRM (este navegador)
        </h4>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              { label: "Leads", value: counts.leads, tab: "leads" as const },
              { label: "Propiedades", value: counts.properties, tab: "properties" as const },
              { label: "Desarrollos", value: counts.developments, tab: "developments" as const },
              { label: "Citas (agenda)", value: counts.agenda, tab: "agenda" as const },
              { label: "Usuarios", value: counts.users, sub: "users" as const },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                "tab" in item
                  ? onNavigate({ type: "tab", tab: item.tab })
                  : onNavigate({ type: "company", sub: item.sub })
              }
              className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 text-left transition hover:border-primary/25 hover:bg-white"
            >
              <p className="text-2xl font-semibold tabular-nums text-brand-navy" style={{ fontWeight: 700 }}>
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500" style={{ fontWeight: 600 }}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500" style={{ fontWeight: 500 }}>
          Datos aproximados en localStorage: ~{Math.round(storageBytes / 1024)} KB
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
        <h4 className="text-base text-brand-navy" style={{ fontWeight: 600 }}>
          Accesos rápidos
        </h4>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickLinks.map((q) => (
            <Button
              key={q.label}
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200"
              onClick={() => onNavigate(q.spec)}
            >
              <q.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {q.label}
              <ArrowRight className="h-3 w-3 opacity-50" strokeWidth={2} />
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-slate-200"
            onClick={() => onNavigate({ type: "tab", tab: "dashboard" })}
          >
            Dashboard
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
        <h4 className="text-base text-brand-navy" style={{ fontWeight: 600 }}>
          Claves de almacenamiento local
        </h4>
        <p className="mt-1 text-sm text-slate-600" style={{ fontWeight: 500 }}>
          Referencia técnica de dónde persiste cada módulo en <code className="text-xs">localStorage</code>.
        </p>
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200/80">
          {CRM_LOCAL_STORAGE_KEYS.map(({ key, label }) => (
            <li key={key} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-800" style={{ fontWeight: 500 }}>
                {label}
              </span>
              <code className="text-[11px] text-slate-500">{key}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 md:p-6">
        <h4 className="text-base text-brand-navy" style={{ fontWeight: 600 }}>
          Sesión
        </h4>
        <p className="mt-1 text-sm text-slate-600" style={{ fontWeight: 500 }}>
          Conectado como <span className="font-medium text-slate-900">{user?.name}</span> ({user?.email})
        </p>
        <Button type="button" variant="outline" className="mt-4 border-slate-200" onClick={() => logout()}>
          Cerrar sesión
        </Button>
      </section>

      <p className="text-center text-[11px] text-slate-400" style={{ fontWeight: 500 }}>
        Panel CRM · {settings.workspaceName || DEFAULT_WORKSPACE_ADMIN_SETTINGS.workspaceName} · datos solo en este navegador
      </p>
    </div>
  );
}
