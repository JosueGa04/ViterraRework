import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Home, Search, Users, X } from "lucide-react";
import { userInitials } from "../../lib/adminWorkspaceSearch";
import { foldSearchText } from "../../lib/searchText";
import { cn } from "../ui/utils";

export type SearchableFilterOption = {
  value: string;
  label: string;
  hint?: string;
  imageUrl?: string;
  initials?: string;
};

type PreviewVariant = "square" | "avatar";
type AllIcon = "home" | "building" | "users";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableFilterOption[];
  allLabel: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  previewVariant?: PreviewVariant;
  allIcon?: AllIcon;
};

const defaultInputClass =
  "h-full min-h-[2.75rem] w-full rounded-2xl border border-slate-200/90 bg-white py-3 pl-10 pr-9 text-sm text-brand-navy shadow-sm transition-all placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

const compactInputClass =
  "h-8 w-full rounded-lg border border-slate-200/90 bg-white py-0 pl-8 pr-8 text-xs text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/15";

function AllIconGlyph({ kind }: { kind: AllIcon }) {
  const cls = "h-5 w-5 text-slate-500";
  if (kind === "building") return <Building2 className={cls} strokeWidth={1.75} />;
  if (kind === "users") return <Users className={cls} strokeWidth={1.75} />;
  return <Home className={cls} strokeWidth={1.75} />;
}

function FilterPreview({
  option,
  variant,
  size = "md",
  allIcon,
}: {
  option?: SearchableFilterOption | null;
  variant: PreviewVariant;
  size?: "sm" | "md";
  allIcon?: AllIcon;
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const rounded = variant === "avatar" ? "rounded-full" : "rounded-lg";
  const imgSrc = option?.imageUrl?.trim();

  if (!option && allIcon) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-slate-100 ring-1 ring-slate-200/80",
          dim,
          rounded,
        )}
      >
        <AllIconGlyph kind={allIcon} />
      </span>
    );
  }

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt=""
        className={cn("shrink-0 object-cover ring-1 ring-slate-200/80", dim, rounded)}
        loading="lazy"
      />
    );
  }

  const initials = option?.initials?.trim() || (option?.label ? userInitials(option.label) : "?");

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-semibold text-white ring-1 ring-slate-200/80 border border-slate-600/20 shadow-sm",
        dim,
        rounded,
        size === "sm" && "text-[10px]",
      )}
    >
      {initials.slice(0, 2)}
    </span>
  );
}

function OptionRow({
  option,
  active,
  variant,
  compact,
  onPick,
}: {
  option: SearchableFilterOption;
  active: boolean;
  variant: PreviewVariant;
  compact?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50",
        active && "bg-primary/5",
        compact && "gap-2 py-2",
      )}
    >
      <FilterPreview option={option} variant={variant} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-brand-navy",
            active && "font-semibold text-primary",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {option.label}
        </p>
        {option.hint ? (
          <p className="truncate text-[10px] text-slate-500">{option.hint}</p>
        ) : null}
      </div>
    </button>
  );
}

export function SearchableFilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  className,
  inputClassName,
  compact = false,
  previewVariant = "square",
  allIcon,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => (value === "all" ? null : options.find((o) => o.value === value) ?? null),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = foldSearchText(query);
    if (!q) return options;
    return options.filter((o) => {
      const blob = foldSearchText(`${o.label} ${o.hint ?? ""}`);
      return blob.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const displayValue = open ? query : selected ? selected.label : "";
  const showPreviews = Boolean(allIcon || previewVariant);

  const pick = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  const inputCls = inputClassName ?? (compact ? compactInputClass : defaultInputClass);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      {label ? (
        <label className="mb-0.5 block text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500">
          {label}
        </label>
      ) : null}

      {selected && !open ? (
        <div
          className={cn(
            "mb-1.5 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-2.5 py-2",
            compact && "mb-1 gap-2 px-2 py-1.5",
          )}
        >
          {showPreviews ? (
            <FilterPreview option={selected} variant={previewVariant} size={compact ? "sm" : "md"} />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-semibold text-brand-navy", compact ? "text-xs" : "text-sm")}>
              {selected.label}
            </p>
            {selected.hint ? (
              <p className="truncate text-[10px] text-slate-500">{selected.hint}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => pick("all")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
            title="Quitar filtro"
            aria-label="Quitar filtro"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400",
            compact ? "h-3.5 w-3.5" : "h-[18px] w-[18px]",
          )}
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? (selected ? "Buscar otro…" : allLabel)}
          className={inputCls}
          style={{ fontWeight: 500 }}
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
      </div>

      {open ? (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
            compact && "text-xs",
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === "all"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("all")}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50",
              value === "all" && "bg-primary/5",
              compact && "gap-2 py-2",
            )}
          >
            {showPreviews && allIcon ? (
              <FilterPreview variant={previewVariant} allIcon={allIcon} size={compact ? "sm" : "md"} />
            ) : null}
            <span
              className={cn(
                "text-brand-navy",
                value === "all" && "font-semibold text-primary",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {allLabel}
            </span>
          </button>

          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-500">
              Sin coincidencias para «{query}».
            </p>
          ) : showPreviews ? (
            filtered.map((o) => (
              <OptionRow
                key={o.value}
                option={o}
                active={value === o.value}
                variant={previewVariant}
                compact={compact}
                onPick={() => pick(o.value)}
              />
            ))
          ) : (
            filtered.map((o) => {
              const active = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-slate-50",
                    active && "bg-primary/5",
                    compact && "py-2",
                  )}
                >
                  <span
                    className={cn(
                      "truncate text-brand-navy",
                      active && "font-semibold text-primary",
                      compact ? "text-xs" : "text-sm",
                    )}
                  >
                    {o.label}
                  </span>
                  {o.hint ? (
                    <span className="truncate text-[10px] text-slate-500">{o.hint}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
