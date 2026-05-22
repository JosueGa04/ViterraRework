import type { DivIcon } from "leaflet";

type LeafletNs = typeof import("leaflet");

/** Pin SVG (misma línea visual que la ficha pública). Evita rutas rotas del marker por defecto en Vite. */
export function createViterraLeafletMarkerIcon(L: LeafletNs): DivIcon {
  return L.divIcon({
    className: "viterra-leaflet-marker",
    html: `
      <div style="position:relative;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.22));">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20 0C11.716 0 5 6.716 5 15c0 10.5 15 33 15 33s15-22.5 15-33C35 6.716 28.284 0 20 0z" fill="#141c2e" stroke="#fff" stroke-width="2.5"/>
          <circle cx="20" cy="15" r="6" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
}
