import type { ComponentType, Dispatch, FormEvent, SetStateAction } from "react";
import {
  Building2,
  Calendar,
  Check,
  Globe2,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import type { UserPermission, UserRole } from "../../contexts/AuthContext";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "../../contexts/authContextTypes";
import { MODULE_PERMISSION_CARDS } from "../../lib/modulePermissions";
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

const createUserFieldClass =
  "h-10 rounded-lg border-stone-200 bg-white text-sm text-brand-navy focus-visible:border-primary/35 focus-visible:ring-primary/15";

export type CreateUserFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  password: string;
  role: UserRole;
  permissions: UserPermission[];
};

export const INITIAL_CREATE_USER_FORM: CreateUserFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  birthDate: "",
  password: "",
  role: "asesor",
  permissions: [...DEFAULT_PERMISSIONS_BY_ROLE.asesor],
};

const permissionCards = MODULE_PERMISSION_CARDS;

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type RoleOption = { value: UserRole; label: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateUserFormState;
  onFormChange: Dispatch<SetStateAction<CreateUserFormState>>;
  error: string;
  submitting: boolean;
  roleOptions: RoleOption[];
  onSubmit: (e: FormEvent) => void;
  onReset: () => void;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  error,
  submitting,
  roleOptions,
  onSubmit,
  onReset,
}: Props) {
  const setRole = (role: UserRole) => {
    onFormChange((prev) => ({ ...prev, role }));
  };

  const applyRoleDefaultPermissions = () => {
    onFormChange((prev) => ({
      ...prev,
      permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[prev.role]],
    }));
  };

  const previewInitials = userInitials(
    form.name.trim() || form.email.split("@")[0] || "?",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onReset();
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-3 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-primary/[0.04] px-6 py-5 text-left">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <UserPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold text-brand-navy">
                Crear usuario
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600">
                Alta en el CRM con acceso al panel. El correo y la contraseña servirán para iniciar
                sesión.
              </DialogDescription>
            </div>
            {form.name.trim() || form.email.trim() ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white ring-2 ring-white shadow-sm"
                aria-hidden
              >
                {previewInitials}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-navy">Acceso al sistema</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Campos obligatorios para la cuenta en Supabase Auth.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="create-name" className="text-xs font-medium text-slate-600">
                    Nombre completo <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <UserCircle2
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-name"
                      required
                      autoComplete="name"
                      placeholder="Ej. María González"
                      value={form.name}
                      onChange={(e) => onFormChange((p) => ({ ...p, name: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-email" className="text-xs font-medium text-slate-600">
                    Correo electrónico <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-email"
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="usuario@viterra.com"
                      value={form.email}
                      onChange={(e) => onFormChange((p) => ({ ...p, email: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-password" className="text-xs font-medium text-slate-600">
                    Contraseña inicial <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-password"
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="Mínimo 6 caracteres"
                      value={form.password}
                      onChange={(e) => onFormChange((p) => ({ ...p, password: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Compártela de forma segura. En el primer acceso deberá cambiarla antes de usar el
                    panel.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-stone-200/90 bg-stone-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-navy">Datos de contacto</h3>
                <p className="mt-0.5 text-xs text-slate-500">Opcional — aparecen en el perfil del equipo.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-phone" className="text-xs font-medium text-slate-600">
                    Teléfono
                  </Label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+52 …"
                      value={form.phone}
                      onChange={(e) => onFormChange((p) => ({ ...p, phone: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-birth" className="text-xs font-medium text-slate-600">
                    Fecha de nacimiento
                  </Label>
                  <div className="relative">
                    <Calendar
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-birth"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => onFormChange((p) => ({ ...p, birthDate: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="create-address" className="text-xs font-medium text-slate-600">
                    Dirección
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <Input
                      id="create-address"
                      autoComplete="street-address"
                      placeholder="Calle, ciudad…"
                      value={form.address}
                      onChange={(e) => onFormChange((p) => ({ ...p, address: e.target.value }))}
                      className={cn(createUserFieldClass, "pl-9")}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-brand-navy">Rol y permisos</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    El rol define el tipo de panel (admin, líder o asesor). Los módulos visibles los
                    marcas abajo.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12rem]">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-role" className="text-xs font-medium text-slate-600">
                      Rol
                    </Label>
                    <Select value={form.role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger id="create-role" className={createUserFieldClass}>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-stone-200 text-xs"
                    onClick={applyRoleDefaultPermissions}
                  >
                    Usar permisos sugeridos del rol
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {permissionCards.map((card) => {
                  const on = form.permissions.includes(card.value);
                  const CardIcon = card.Icon;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => {
                        onFormChange((prev) => ({
                          ...prev,
                          permissions: on
                            ? prev.permissions.filter((p) => p !== card.value)
                            : [...prev.permissions, card.value],
                        }));
                      }}
                      className={cn(
                        "relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                        on
                          ? "border-primary/45 bg-primary/[0.05] ring-1 ring-primary/20"
                          : "border-stone-200/90 bg-white hover:border-stone-300 hover:bg-stone-50/80",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                          on
                            ? "bg-primary/15 text-primary ring-primary/20"
                            : "bg-stone-100 text-slate-600 ring-stone-200/80",
                        )}
                      >
                        <CardIcon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-brand-navy">{card.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {card.description}
                        </p>
                      </div>
                      {on ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      ) : (
                        <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-stone-200 bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                {error}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-stone-200"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                "Creando…"
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
