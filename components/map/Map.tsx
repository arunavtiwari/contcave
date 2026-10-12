"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import { isLatLng, type LatLng } from "@/lib/geo";
import { APPROXIMATE_AREA_RADIUS_METERS } from "@/lib/listing/utils";
import { cn } from "@/lib/utils";

type Props = {
  center?: number[];
  animated?: boolean;
  area?: boolean;
};

const INDIA_CENTER: LatLng = [20.5937, 78.9629];
const OVERVIEW_ZOOM = 4;
const PIN_ZOOM = 16;
const AREA_ZOOM = 13.5;
const MAX_ZOOM = 19;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const AREA_STYLE = {
  color: "#18181b",
  fillColor: "#18181b",
  weight: 2,
  opacity: 0.85,
  fillOpacity: 0.15,
  interactive: false,
} as const;

const PIN_ICON = L.icon({
  iconUrl: "/images/icons/marker.png",
  iconRetinaUrl: "/images/icons/marker.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

const focusZoom = (area: boolean) => (area ? AREA_ZOOM : PIN_ZOOM);

function MapViewport({ center, zoom, animated }: { center: LatLng | null; zoom: number; animated: boolean }) {
  const map = useMap();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map.getPane("mapPane")) return;

    const target = center ?? INDIA_CENTER;
    const key = `${target[0]},${target[1]},${zoom}`;
    if (shownRef.current === key) return;
    shownRef.current = key;

    if (animated) map.flyTo(target, zoom, { duration: center ? 1.2 : 0.8, easeLinearity: 0.25 });
    else map.setView(target, zoom);
  }, [animated, center, map, zoom]);

  return null;
}

function Map({ center, animated = false, area = false }: Props) {
  const point = isLatLng(center) ? center : null;
  const zoom = point ? focusZoom(area) : OVERVIEW_ZOOM;

  return (
    <MapContainer
      center={point ?? INDIA_CENTER}
      zoom={zoom}
      minZoom={3}
      maxZoom={MAX_ZOOM}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className={cn("z-0 w-full rounded-xl", area ? "h-90" : "h-[35vh]")}
    >
      <MapViewport center={point} zoom={zoom} animated={animated} />
      <TileLayer url={TILE_URL} maxZoom={MAX_ZOOM} detectRetina />
      {point && (area
        ? <Circle center={point} radius={APPROXIMATE_AREA_RADIUS_METERS} pathOptions={AREA_STYLE} />
        : <Marker position={point} icon={PIN_ICON} />)}
    </MapContainer>
  );
}

export default Map;
