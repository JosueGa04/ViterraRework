import { useRef, type Dispatch, type SetStateAction } from "react";
import { Camera, Mail, Trash2 } from "lucide-react";
import { cn } from "../../ui/utils";
import type { TokkoUserProfilePatch } from "../../../lib/supabaseTokkoUsers";
import { ProfileCopyButton } from "./ProfileCopyButton";
import type { ProfileDraft } from "./profileTypes";
import { avatarFrame, avatarInitialClass, inputClass, profileIdentityAside } from "./profileUi";

type Props = {
  draft: ProfileDraft;
  setDraft: Dispatch<SetStateAction<ProfileDraft>>;
  roleLabel: string;
  saving: boolean;
  readOnly?: boolean;
  canEditEmail: boolean;
  hasTokkoDirectoryRow: boolean;
  onPictureFileChange: (file: File | null) => void;
  onClearField: (key: keyof TokkoUserProfilePatch) => void;
};

export function ProfileIdentityColumn({
  draft,
  setDraft,
  roleLabel,
  saving,
  readOnly = false,
  canEditEmail,
  hasTokkoDirectoryRow,
  onPictureFileChange,
  onClearField,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = (draft.name || "?").trim().charAt(0).toUpperCase();
  const emailEditable = !readOnly && canEditEmail && hasTokkoDirectoryRow;
  const hasPicture = Boolean(draft.picture?.trim());

  return (
    <aside className={profileIdentityAside} aria-label="Identidad del perfil">
      <div className={avatarFrame}>
        {hasPicture ? (
          <img src={draft.picture} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={avatarInitialClass}>{initial}</span>
        )}
      </div>

      {readOnly ? (
        <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
          La foto de perfil la actualiza un administrador.
        </p>
      ) : (
        <div className="mt-4 flex w-full max-w-[12rem] flex-col gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-brand-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Cambiar foto
          </button>
          {hasPicture ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => onClearField("picture")}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Quitar foto
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            aria-label="Subir foto de perfil"
            onChange={(e) => {
              onPictureFileChange(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <p className="text-[10px] leading-relaxed text-slate-500">PNG o JPG · máx. 3 MB · recorte cuadrado</p>
        </div>
      )}

      <div className="mt-6 w-full min-w-0 space-y-3">
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full border border-brand-navy/15 bg-brand-navy/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
            {roleLabel}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <Mail className="mb-px mr-1 inline h-3 w-3" strokeWidth={1.5} />
              Correo
            </span>
            <ProfileCopyButton value={draft.email} disabled={saving} />
          </div>
          <input
            type="email"
            className={cn(inputClass, !emailEditable && "cursor-default bg-slate-100/80 text-slate-600")}
            readOnly={!emailEditable}
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            title={
              !canEditEmail
                ? "Solo un administrador puede cambiar el correo."
                : !hasTokkoDirectoryRow
                  ? "Tu cuenta aún no tiene fila en el directorio CRM."
                  : undefined
            }
          />
          {readOnly || !canEditEmail ? (
            <p className="text-[10px] leading-relaxed text-slate-500">
              Pide a un administrador si necesitas cambiar tu correo.
            </p>
          ) : !hasTokkoDirectoryRow ? (
            <p className="text-[10px] leading-relaxed text-slate-500">
              Editable cuando tu usuario esté en el directorio CRM.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
