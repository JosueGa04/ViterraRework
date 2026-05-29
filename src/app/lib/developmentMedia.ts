import type { Development } from "../data/developments";
import type { PropertyTour3dEntry } from "./propertyTours3d";
import type { PropertyVideoEntry } from "./propertyVideos";
import {
  legacyTour3dUrlFromTours,
  parsePropertyTours3dJson,
  propertyTours3dToJson,
  tours3dFromLegacyFields,
} from "./propertyTours3d";
import {
  legacyVideoColumnsFromVideos,
  parsePropertyVideosJson,
  propertyVideosFromRow,
  propertyVideosToJson,
  videosFromLegacyFields,
} from "./propertyVideos";

export type { PropertyVideoEntry as DevelopmentVideoEntry };
export type { PropertyTour3dEntry as DevelopmentTour3dEntry };

export function developmentVideosFromRow(row: {
  property_videos?: unknown;
  video_url?: string | null;
  video_storage_path?: string | null;
  payload?: Record<string, unknown> | null;
}): PropertyVideoEntry[] {
  return propertyVideosFromRow({
    property_videos: row.property_videos,
    video_url: row.video_url,
    video_storage_path: row.video_storage_path,
    payload:
      row.payload && typeof row.payload === "object"
        ? { viterra_videos: row.payload.viterra_videos }
        : null,
  });
}

export function developmentTours3dFromRow(row: {
  property_tours_3d?: unknown;
  tour_3d_url?: string | null;
  payload?: Record<string, unknown> | null;
}): PropertyTour3dEntry[] {
  const fromCol = parsePropertyTours3dJson(row.property_tours_3d);
  if (fromCol.length > 0) return fromCol;
  const fromPayload = parsePropertyTours3dJson(
    row.payload && typeof row.payload === "object" ? row.payload.viterra_tours_3d : undefined,
  );
  if (fromPayload.length > 0) return fromPayload;
  const url = row.tour_3d_url?.trim();
  if (url) return tours3dFromLegacyFields({ tour3dUrl: url });
  return [];
}

export function developmentVideosToJson(videos: PropertyVideoEntry[]): PropertyVideoEntry[] {
  return propertyVideosToJson(videos);
}

export function developmentTours3dToJson(tours: PropertyTour3dEntry[]): PropertyTour3dEntry[] {
  return propertyTours3dToJson(tours);
}

export function legacyDevelopmentVideoColumns(videos: PropertyVideoEntry[]): {
  video_url: string | null;
  video_storage_path: string | null;
} {
  const legacy = legacyVideoColumnsFromVideos(videos);
  return {
    video_url: legacy.video_url,
    video_storage_path: null,
  };
}

export function developmentVideosList(
  d: Pick<Development, "videos" | "videoUrl">,
): PropertyVideoEntry[] {
  return videosFromLegacyFields({ videos: d.videos, videoUrl: d.videoUrl });
}

export function developmentTours3dList(
  d: Pick<Development, "tours3d" | "tour3dUrl">,
): PropertyTour3dEntry[] {
  return tours3dFromLegacyFields({ tours3d: d.tours3d, tour3dUrl: d.tour3dUrl });
}

export function developmentMediaFromApp(d: {
  videos?: PropertyVideoEntry[];
  videoUrl?: string;
  videoStoragePath?: string;
  tours3d?: PropertyTour3dEntry[];
  tour3dUrl?: string;
}): {
  videosJson: PropertyVideoEntry[];
  toursJson: PropertyTour3dEntry[];
  legacyVideo: { video_url: string | null; video_storage_path: string | null };
  legacyTourUrl: string | null;
} {
  const videosJson = developmentVideosToJson(
    videosFromLegacyFields({
      videos: d.videos,
      videoUrl: d.videoUrl,
      videoStoragePath: d.videoStoragePath,
    }),
  );
  const toursJson = developmentTours3dToJson(
    tours3dFromLegacyFields({ tours3d: d.tours3d, tour3dUrl: d.tour3dUrl }),
  );
  return {
    videosJson,
    toursJson,
    legacyVideo: legacyDevelopmentVideoColumns(videosJson),
    legacyTourUrl: legacyTour3dUrlFromTours(toursJson),
  };
}
