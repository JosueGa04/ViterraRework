import { useEffect, useRef } from "react";
import { Development } from "../../data/developments";

interface Props {
  developments: Development[];
  mapHeightClassName?: string;
}

const MAP_PRIMARY = "#C8102E";
const MAP_NAVY = "#141c2e";
const MAP_MUTED = "rgba(20, 28, 46, 0.62)";
const MAP_BORDER = "rgba(20, 28, 46, 0.12)";
const MAP_BG_HOVER = "#f4f2ef";

export function AdminDevelopmentsMap({
  developments,
  mapHeightClassName = "h-[min(60vh,520px)]",
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || isInitializingRef.current) return;
      isInitializingRef.current = true;

      try {
        const L = await import("leaflet");
        (window as unknown as { L: typeof L }).L = L;
        await import("leaflet/dist/leaflet.css");
        await import("leaflet.markercluster/dist/leaflet.markercluster.js");
        await import("leaflet.markercluster/dist/MarkerCluster.css");
        await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
        await new Promise((r) => setTimeout(r, 100));

        if (mapInstanceRef.current) {
          isInitializingRef.current = false;
          return;
        }

        const withCoords = developments.filter((d) => d.coordinates);
        if (withCoords.length === 0) {
          isInitializingRef.current = false;
          return;
        }

        const center: [number, number] = [
          withCoords.reduce((s, d) => s + d.coordinates.lat, 0) / withCoords.length,
          withCoords.reduce((s, d) => s + d.coordinates.lng, 0) / withCoords.length,
        ];

        const map = L.map(mapRef.current).setView(center, 12);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map);

        const Lm = L as typeof import("leaflet") & {
          markerClusterGroup?: (opts: object) => { addLayer: (m: unknown) => void };
        };
        const markers =
          typeof Lm.markerClusterGroup === "function"
            ? Lm.markerClusterGroup({
                maxClusterRadius: 60,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                iconCreateFunction(cluster: { getChildCount: () => number }) {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                    html: `<div style="
                  background: linear-gradient(135deg, ${MAP_PRIMARY} 0%, #7f1d1d 100%);
                  width: 50px; height: 50px; border-radius: 50%;
                  display: flex; align-items: center; justify-content: center;
                  border: 3px solid white;
                  box-shadow: 0 4px 12px rgba(200, 16, 46, 0.45);
                  font-weight: 700; font-size: 16px; color: white;
                  font-family: Poppins, sans-serif;
                ">${count}</div>`,
                    className: "custom-cluster-icon",
                    iconSize: L.point(50, 50),
                  });
                },
              })
            : null;

        withCoords.forEach((d) => {
          const customIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="position: relative; cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" fill="${MAP_PRIMARY}" stroke="white" stroke-width="3"/>
                <path d="M16 32V18L24 12L32 18V32H16Z" fill="white"/>
                <rect x="21" y="24" width="6" height="8" fill="${MAP_PRIMARY}"/>
              </svg>
            </div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            popupAnchor: [0, -24],
          });

          const marker = L.marker([d.coordinates.lat, d.coordinates.lng], { icon: customIcon });

          const popupContent = `
            <div style="font-family: Poppins, sans-serif; width: 280px;">
              <a href="/desarrollos/${d.id}" target="_blank" rel="noreferrer" style="text-decoration: none; display: block;">
                <div style="position: relative; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
                  <img src="${d.image}" alt="" style="width: 100%; height: 140px; object-fit: cover; display: block;" />
                  <div style="position: absolute; top: 10px; left: 10px;">
                    <span style="padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
                      background: rgba(255,255,255,0.95); color: ${MAP_NAVY};">${d.type}</span>
                  </div>
                </div>
                <h3 style="font-weight: 600; font-size: 17px; color: ${MAP_NAVY}; margin: 0 0 6px 0;">${d.name}</h3>
                <p style="font-size: 13px; color: ${MAP_MUTED}; margin: 0 0 10px 0;">${d.location}</p>
                <p style="font-weight: 700; font-size: 18px; color: ${MAP_NAVY}; margin: 0;">${d.priceRange}</p>
              </a>
            </div>
          `;

          marker.bindPopup(popupContent, { maxWidth: 300, className: "custom-popup-dev", closeButton: true });
          if (markers) markers.addLayer(marker);
          else marker.addTo(map);
        });

        if (markers) map.addLayer(markers as unknown as import("leaflet").Layer);
        mapInstanceRef.current = map;
        isInitializingRef.current = false;
      } catch (e) {
        console.error("Error initializing developments map:", e);
        isInitializingRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          /* ignore */
        }
        mapInstanceRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, [developments]);

  const withCoords = developments.filter((d) => d.coordinates);
  if (withCoords.length === 0) return null;

  return (
    <div>
      <style>{`
        .custom-marker { background: none; border: none; }
        .custom-cluster-icon { background: none !important; border: none !important; }
        .marker-cluster { background: none !important; }
        .custom-popup-dev .leaflet-popup-content-wrapper {
          border-radius: 16px; padding: 16px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          border: 1px solid ${MAP_BORDER};
        }
        .custom-popup-dev .leaflet-popup-content { margin: 0; width: 280px !important; }
        .custom-popup-dev .leaflet-popup-tip { background: white; border: 1px solid ${MAP_BORDER}; border-top: none; border-left: none; }
        .custom-popup-dev .leaflet-popup-close-button {
          color: ${MAP_MUTED}; font-size: 22px; font-weight: 600; padding: 6px 10px;
        }
        .custom-popup-dev .leaflet-popup-close-button:hover { color: ${MAP_NAVY}; background: ${MAP_BG_HOVER}; }
      `}</style>
      <div ref={mapRef} className={`${mapHeightClassName} w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm`} />
    </div>
  );
}
