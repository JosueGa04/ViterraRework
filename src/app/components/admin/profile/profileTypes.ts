import type { UserPermission } from "../../../contexts/AuthContext";
import { MODULE_PERMISSION_CARDS } from "../../../lib/modulePermissions";

export type ProfileDraft = {
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  position: string;
  picture: string;
};

export const emptyProfileDraft: ProfileDraft = {
  name: "",
  email: "",
  phone: "",
  cellphone: "",
  position: "",
  picture: "",
};

export type ProfileTabId = "personal" | "performance" | "access";

export const PROFILE_TABS: Array<{ id: ProfileTabId; label: string }> = [
  { id: "personal", label: "Datos personales" },
  { id: "performance", label: "Equipo y rendimiento" },
  { id: "access", label: "Acceso y permisos" },
];

export const profilePermissionCards = MODULE_PERMISSION_CARDS;

export const roleLabelByValue: Record<string, string> = {
  admin: "Administrador",
  lider_grupo: "Líder de grupo",
  asesor: "Asesor",
};
