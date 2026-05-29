export const WORKSPACE_ADMIN_SETTINGS_KEY = "viterra_workspace_admin_settings";

export interface WorkspaceAdminSettings {
  /** Etiqueta interna del espacio; se muestra en el pie del panel CRM */
  workspaceName: string;
  /** Moneda de referencia preferida del espacio */
  defaultCurrency: "MXN" | "USD";
  /** Correo de contacto interno del equipo */
  contactEmail: string;
  /** Teléfono de la empresa; aparece en las fichas técnicas PDF */
  companyPhone: string;
  /** Dirección de la empresa; aparece en las fichas técnicas PDF */
  companyAddress: string;
  /** Sitio web de la empresa; aparece en las fichas técnicas PDF */
  companyWebsite: string;
  /** RFC de la empresa; aparece en las fichas técnicas PDF si se captura */
  companyTaxId: string;
}

export const DEFAULT_WORKSPACE_ADMIN_SETTINGS: WorkspaceAdminSettings = {
  workspaceName: "Viterra",
  defaultCurrency: "MXN",
  contactEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyWebsite: "",
  companyTaxId: "",
};

export function loadWorkspaceAdminSettings(): WorkspaceAdminSettings {
  try {
    const raw = localStorage.getItem(WORKSPACE_ADMIN_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE_ADMIN_SETTINGS };
    const o = JSON.parse(raw) as Partial<WorkspaceAdminSettings>;
    return {
      workspaceName:
        typeof o.workspaceName === "string" && o.workspaceName.trim()
          ? o.workspaceName.trim()
          : DEFAULT_WORKSPACE_ADMIN_SETTINGS.workspaceName,
      defaultCurrency: o.defaultCurrency === "USD" ? "USD" : "MXN",
      contactEmail: typeof o.contactEmail === "string" ? o.contactEmail : "",
      companyPhone: typeof o.companyPhone === "string" ? o.companyPhone : "",
      companyAddress: typeof o.companyAddress === "string" ? o.companyAddress : "",
      companyWebsite: typeof o.companyWebsite === "string" ? o.companyWebsite : "",
      companyTaxId: typeof o.companyTaxId === "string" ? o.companyTaxId : "",
    };
  } catch {
    return { ...DEFAULT_WORKSPACE_ADMIN_SETTINGS };
  }
}

export function saveWorkspaceAdminSettings(next: WorkspaceAdminSettings): void {
  localStorage.setItem(WORKSPACE_ADMIN_SETTINGS_KEY, JSON.stringify(next));
}

/** Claves locales que componen la “base” del CRM en este navegador */
export const CRM_LOCAL_STORAGE_KEYS: Array<{ key: string; label: string }> = [
  { key: "viterra_leads", label: "Leads y pipeline" },
  { key: "viterra_crm_clients", label: "Clientes del CRM" },
  { key: "viterra_properties", label: "Propiedades (catálogo admin)" },
  { key: "viterra_admin_developments", label: "Desarrollos" },
  { key: "viterra_kanban_pipeline_by_group", label: "Pipeline Kanban por grupo de trabajo" },
  { key: "viterra_kanban_custom_stages", label: "Etapas Kanban (legado; migrado al guardar por grupo)" },
  { key: "viterra_kanban_stage_order", label: "Orden de columnas (legado)" },
  { key: "viterra_kanban_stage_colors", label: "Colores de columnas (legado)" },
  { key: "viterra_agenda_appointments", label: "Citas de la agenda" },
  { key: "viterra_site_content", label: "Contenido del sitio web" },
  { key: "viterra_admin_users", label: "Usuarios del CRM" },
  { key: "viterra_user_groups", label: "Equipos de trabajo (usuarios)" },
  { key: "viterra_admin_passwords", label: "Contraseñas (hash local)" },
  { key: WORKSPACE_ADMIN_SETTINGS_KEY, label: "Ajustes del espacio de trabajo" },
];
