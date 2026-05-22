import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { MapPin } from "lucide-react";
import { createViterraLeafletMarkerIcon } from "../../../lib/leafletViterraMarkerIcon";
import {
  PropertyField,
  PropertyFieldGrid,
  PropertyFormSection,
  propertyFieldClass,
} from "./propertyFormUi";

type Props = {
  location: string;
  colony: string;
  fullAddress: string;
  lat: number;
  lng: number;
  onLocationChange: (v: string) => void;
  onColonyChange: (v: string) => void;
  onFullAddressChange: (v: string) => void;
  onCoordsChange: (lat: number, lng: number) => void;
};

export function PropertyLocationSection({
  location,
  colony,
  fullAddress,
  lat,
  lng,
  onLocationChange,
  onColonyChange,
  onFullAddressChange,
  onCoordsChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      void import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 14);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: createViterraLeafletMarkerIcon(L),
      }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onCoordsChange(pos.lat, pos.lng);
      });
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        onCoordsChange(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    mapInstanceRef.current?.setView([lat, lng], mapInstanceRef.current.getZoom());
    markerRef.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  return (
    <PropertyFormSection
      icon={MapPin}
      title="Ubicación y mapa"
      description="La dirección y las coordenadas alimentan la pestaña Ubicación y los enlaces a Google Maps."
    >
      <PropertyFieldGrid>
        <PropertyField label="Ciudad / zona" span={2}>
          <input className={propertyFieldClass} value={location} onChange={(e) => onLocationChange(e.target.value)} />
        </PropertyField>
        <PropertyField label="Colonia">
          <input className={propertyFieldClass} value={colony} onChange={(e) => onColonyChange(e.target.value)} />
        </PropertyField>
        <PropertyField label="Dirección completa">
          <input className={propertyFieldClass} value={fullAddress} onChange={(e) => onFullAddressChange(e.target.value)} />
        </PropertyField>
        <PropertyField label="Latitud">
          <input
            type="number"
            step="any"
            className={propertyFieldClass}
            value={lat}
            onChange={(e) => onCoordsChange(Number(e.target.value), lng)}
          />
        </PropertyField>
        <PropertyField label="Longitud">
          <input
            type="number"
            step="any"
            className={propertyFieldClass}
            value={lng}
            onChange={(e) => onCoordsChange(lat, Number(e.target.value))}
          />
        </PropertyField>
      </PropertyFieldGrid>
      <p className="mb-2 mt-5 text-xs text-slate-500">Clic en el mapa o arrastra el pin.</p>
      <style>{`.viterra-leaflet-marker{background:transparent!important;border:none!important;}`}</style>
      <div ref={mapRef} className="h-72 w-full overflow-hidden rounded-2xl border border-stone-200 shadow-inner" />
    </PropertyFormSection>
  );
}
