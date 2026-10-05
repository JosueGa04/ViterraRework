import { useEffect, useRef, useState } from "react";
import { Layers, MapPin } from "lucide-react";
import type { Property } from "./PropertyCard";
import { escapeHtml } from "../lib/escapeHtml";
import { getViterraStreetTileLayer } from "../lib/mapTileConfig";

function formatShortPrice(price: number): string {
  if (price >= 1_000_000) {
    return (price / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (price >= 1_000) {
    return (price / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return price.toString();
}
function computeDisplayCoordinates(list: Property[]): Map<string, { lat: number; lng: number }> {
  const grouped = new Map<string, Property[]>();
  const out = new Map<string, { lat: number; lng: number }>();

  for (const p of list) {
    if (!p.coordinates) continue;
    const key = `${p.coordinates.lat.toFixed(6)},${p.coordinates.lng.toFixed(6)}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(p);
    else grouped.set(key, [p]);
  }

  grouped.forEach((bucket, key) => {
    if (bucket.length === 1) {
      const p = bucket[0];
      out.set(p.id, { lat: p.coordinates!.lat, lng: p.coordinates!.lng });
      return;
    }

    const baseLat = bucket[0].coordinates!.lat;
    const baseLng = bucket[0].coordinates!.lng;
    const baseRadiusMeters = Math.min(42, 18 + bucket.length * 2.5);
    const latMeters = 111_320;
    const lngMeters = Math.max(1, 111_320 * Math.cos((baseLat * Math.PI) / 180));
    const seed = key.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const phase = (seed % 360) * (Math.PI / 180);

    bucket.forEach((p, idx) => {
      const angle = phase + (idx / bucket.length) * Math.PI * 2;
      const ring = baseRadiusMeters + (idx % 2 === 0 ? 0 : 6);
      const dLat = (Math.sin(angle) * ring) / latMeters;
      const dLng = (Math.cos(angle) * ring) / lngMeters;
      out.set(p.id, { lat: baseLat + dLat, lng: baseLng + dLng });
    });
  });

  return out;
}

interface PropertyMapProps {
  properties: Property[];
  mapHeightClassName?: string;
}

type MapMode = "map" | "satellite";

export function PropertyMap({ properties, mapHeightClassName = "h-[500px]" }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);
  const [mapMode, setMapMode] = useState<MapMode>("map");
  const [mapReady, setMapReady] = useState(false);

  const propertiesWithCoordinates = properties.filter((p) => p.coordinates);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || propertiesWithCoordinates.length === 0) return;
      try {
        const L = await import("leaflet");
        if (cancelled || !mapRef.current) return;
        leafletRef.current = L;
        await import("leaflet/dist/leaflet.css");

        const center: [number, number] = [
          propertiesWithCoordinates.reduce((sum, p) => sum + (p.coordinates?.lat || 0), 0) / propertiesWithCoordinates.length,
          propertiesWithCoordinates.reduce((sum, p) => sum + (p.coordinates?.lng || 0), 0) / propertiesWithCoordinates.length,
        ];

        const map = (L as any).map(mapRef.current, { zoomControl: true }).setView(center, 12);
        mapInstanceRef.current = map;

        const updateTooltipVisibility = () => {
          if (!mapRef.current) return;
          if (map.getZoom() < 12) {
            mapRef.current.classList.add('hide-price-tooltips');
          } else {
            mapRef.current.classList.remove('hide-price-tooltips');
          }
        };
        map.on('zoomend', updateTooltipVisibility);
        updateTooltipVisibility();

        streetLayerRef.current = getViterraStreetTileLayer(L);
        satelliteLayerRef.current = (L as any).tileLayer(
          "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
          {
            attribution: "&copy; <a href=\"https://www.google.com/maps\">Google Maps</a>",
            maxZoom: 20,
          }
        );
        markersLayerRef.current = (L as any).layerGroup().addTo(map);

        (mapMode === "satellite" ? satelliteLayerRef.current : streetLayerRef.current).addTo(map);
        setMapReady(true);
      } catch (error) {
        console.error("Error initializing property map:", error);
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      if (!mapInstanceRef.current) return;
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.error("Error removing map:", error);
      }
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
      setMapReady(false);
    };
  }, [propertiesWithCoordinates.length]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !streetLayerRef.current || !satelliteLayerRef.current) return;
    if (mapMode === "satellite") {
      if (map.hasLayer(streetLayerRef.current)) map.removeLayer(streetLayerRef.current);
      if (!map.hasLayer(satelliteLayerRef.current)) satelliteLayerRef.current.addTo(map);
    } else {
      if (map.hasLayer(satelliteLayerRef.current)) map.removeLayer(satelliteLayerRef.current);
      if (!map.hasLayer(streetLayerRef.current)) streetLayerRef.current.addTo(map);
    }
  }, [mapMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const L = leafletRef.current;
    if (!map || !markersLayer || !L) return;
    markersLayer.clearLayers();
    if (propertiesWithCoordinates.length === 0) return;

    try {
      const bounds = (L as any).latLngBounds([]);
      const displayCoords = computeDisplayCoordinates(propertiesWithCoordinates);

      propertiesWithCoordinates.forEach((property) => {
        const coord = displayCoords.get(property.id) ?? property.coordinates;
        if (!coord) return;
        bounds.extend([coord.lat, coord.lng]);

        const marker = (L as any).circleMarker([coord.lat, coord.lng], {
          radius: 8,
          fillColor: "#C8102E",
          color: "#ffffff",
          weight: 2,
          fillOpacity: 0.95,
        });

        const activePrice = property.status === "alquiler"
          ? (property.rentalPrice || property.price || 0)
          : (property.price || property.rentalPrice || 0);
        const shortPrice = formatShortPrice(activePrice);

        marker.bindTooltip(`$${shortPrice}`, {
          permanent: true,
          direction: "top",
          className: "price-marker-tooltip",
          offset: [0, -8]
        });

        const displayPrice = property.status === "alquiler" 
          ? (property.rentalPrice || property.price || 0) 
          : (property.price || 0);

        marker.bindPopup(
          `
            <div style="font-family: Poppins, sans-serif; width: 220px;">
              <a href="/propiedades/${escapeHtml(property.id)}" style="text-decoration:none;color:#141c2e;display:block;">
                <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;line-height:1.3;">${escapeHtml(property.title)}</p>
                <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;">${escapeHtml(property.location)}</p>
                <p style="margin:0;font-size:14px;font-weight:700;">$${escapeHtml(displayPrice.toLocaleString())}${property.status === "alquiler"
            ? ' <span style="font-weight:500;color:#64748b;">/ mes</span>'
            : property.status === "venta_y_alquiler"
              ? ` <span style="font-weight:500;color:#64748b;">venta</span><br/><span style="font-size:13px;font-weight:600;">$${escapeHtml((property.rentalPrice ?? property.price).toLocaleString())} / mes</span>`
              : ""
          }</p>
              </a>
            </div>
          `,
          { className: "property-map-popup", maxWidth: 250 }
        );

        let closeTimeout: any;

        marker.on('mouseover', function (this: any) {
          if (closeTimeout) clearTimeout(closeTimeout);
          this.openPopup();
        });

        marker.on('mouseout', function (this: any) {
          closeTimeout = setTimeout(() => {
            this.closePopup();
          }, 250);
        });

        marker.on('popupopen', function(e: any) {
           const popupNode = e.popup._container;
           if (!popupNode) return;
           popupNode.addEventListener('mouseenter', () => {
             if (closeTimeout) clearTimeout(closeTimeout);
           });
           popupNode.addEventListener('mouseleave', () => {
             closeTimeout = setTimeout(() => {
               marker.closePopup();
             }, 250);
           });
        });

        markersLayer.addLayer(marker);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      }
    } catch (error) {
      console.error("Error rendering property markers:", error);
    }
  }, [propertiesWithCoordinates]);

  if (propertiesWithCoordinates.length === 0) return null;

  return (
    <div className="relative">
      <style>{`
        .property-map-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          border: 1px solid rgba(20, 28, 46, 0.14);
        }
        .hide-price-tooltips .price-marker-tooltip {
          opacity: 0 !important;
          pointer-events: none;
        }
        .price-marker-tooltip {
          background: #ffffff;
          border: none;
          border-radius: 20px;
          padding: 3px 8px;
          font-family: Poppins, sans-serif;
          font-weight: 600;
          font-size: 11px;
          color: #141c2e;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          transition: opacity 0.2s ease-in-out;
        }
        .price-marker-tooltip.leaflet-tooltip-top:before {
          display: none;
        }
      `}</style>
      {!mapReady && (
        <div className={`${mapHeightClassName} absolute inset-0 z-[501] flex flex-col items-center justify-center overflow-hidden rounded-lg border border-brand-navy/10 bg-slate-100`}>
          <div className="relative mb-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-navy/15 border-t-primary" />
            <MapPin className="absolute inset-0 m-auto h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <p className="font-heading text-sm font-medium text-brand-navy/60">Cargando mapa…</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMapMode((prev) => (prev === "map" ? "satellite" : "map"))}
        className="absolute right-3 top-3 z-[500] inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        aria-label={mapMode === "map" ? "Cambiar a vista satelital" : "Cambiar a vista mapa"}
        title={mapMode === "map" ? "Satélite" : "Mapa"}
      >
        <Layers className="h-4 w-4" />
      </button>
      <div ref={mapRef} className={`${mapHeightClassName} w-full overflow-hidden rounded-lg border border-brand-navy/10 shadow-lg`} />
    </div>
  );
}