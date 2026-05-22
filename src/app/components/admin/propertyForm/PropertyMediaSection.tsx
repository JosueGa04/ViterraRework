import { type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Box, Check, Film } from "lucide-react";
import { cn } from "../../ui/utils";
import type { Property } from "../../PropertyCard";
import { propertyTours3dList, propertyVideosList } from "../../PropertyCard";
import { PropertyVideosEditor } from "./PropertyVideosEditor";
import { PropertyTours3dEditor } from "./PropertyTours3dEditor";

type Props = {
  client: SupabaseClient | null;
  propertyId: string;
  draft: Property;
  onDraftChange: (patch: Partial<Property>) => void;
};

function MediaPanel({
  icon: Icon,
  title,
  description,
  active,
  children,
}: {
  icon: typeof Film;
  title: string;
  description: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition",
        active ? "border-primary/30 ring-1 ring-primary/15" : "border-stone-200/90",
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            active ? "bg-primary/10 text-primary" : "bg-stone-100 text-slate-500",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-heading text-sm font-semibold text-brand-navy">{title}</h4>
            {active ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Check className="h-3 w-3" />
                Activo
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function PropertyMediaSection({ client, propertyId, draft, onDraftChange }: Props) {
  const videos = propertyVideosList(draft);
  const hasVideo = videos.length > 0;
  const tours3d = propertyTours3dList(draft);
  const hasTour = tours3d.length > 0;

  const onVideosChange = (next: Property["videos"]) => {
    onDraftChange({
      videos: next,
      videoUrl: undefined,
      videoStoragePath: undefined,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MediaPanel
        icon={Film}
        title="Videos"
        description="Varios enlaces (YouTube, Vimeo) y/o archivos subidos en la misma ficha."
        active={hasVideo}
      >
        <PropertyVideosEditor
          client={client}
          propertyId={propertyId}
          videos={videos}
          onChange={onVideosChange}
        />
      </MediaPanel>

      <MediaPanel
        icon={Box}
        title="Recorrido 3D"
        description="Varios enlaces Matterport, Kuula u otro visor embebible, cada uno con título opcional."
        active={hasTour}
      >
        <PropertyTours3dEditor
          tours={tours3d}
          onChange={(next) =>
            onDraftChange({
              tours3d: next,
              tour3dUrl: undefined,
            })
          }
        />
      </MediaPanel>
    </div>
  );
}
