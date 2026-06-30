"use client";

import "leaflet/dist/leaflet.css";
import "@/styles/leaflet-overrides.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap,ZoomControl } from "react-leaflet";

type Props = {
  center?: [number, number];
  animated?: boolean;
  isExact?: boolean;
  draggable?: boolean;
};

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

function MapViewportController({
  center,
  zoom,
  shouldFocus,
  animated,
}: {
  center: [number, number];
  zoom: number;
  shouldFocus: boolean;
  animated: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const targetCenter = shouldFocus ? center : INDIA_CENTER;
    const targetZoom = shouldFocus ? zoom : 4;

    if (!animated) {
      map.setView(targetCenter, targetZoom);
      return;
    }

    if (!shouldFocus) {
      map.flyTo(INDIA_CENTER, 4, { duration: 0.8, easeLinearity: 0.25 });
      return;
    }

    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [animated, center, map, shouldFocus, zoom]);

  return null;
}

function Map({ center, animated = false, isExact = true, draggable = false }: Props) {
  const isValidCenter = useMemo(() => {
    return (
      Array.isArray(center) &&
      center.length === 2 &&
      Number.isFinite(center[0]) &&
      Number.isFinite(center[1])
    );
  }, [center]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!isValidCenter || !center) return INDIA_CENTER;
    return [center[0], center[1]];
  }, [center, isValidCenter]);

  const customIcon = useMemo(() => {
    return L.icon({
      iconUrl: "/images/icons/marker.png",
      iconRetinaUrl: "/images/icons/marker.png",
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });
  }, []);

  return (
    <MapContainer
      center={mapCenter}
      zoom={isValidCenter ? 14 : 4}
      minZoom={3}
      maxZoom={19}
      scrollWheelZoom={false}
      dragging={draggable}
      zoomControl={false}
      attributionControl={false}
      preferCanvas
      className="z-0 h-[35vh] w-full rounded-xl outline-none focus:outline-none focus:ring-0"
    >
      <MapViewportController
        center={mapCenter}
        zoom={isValidCenter ? (isExact ? 15 : 13) : 4}
        shouldFocus={isValidCenter}
        animated={animated}
      />
      <TileLayer
        url={TILE_URL}
        maxZoom={19}
        detectRetina
      />
      <ZoomControl position="bottomright" />

      {isValidCenter && isExact && <Marker position={mapCenter} icon={customIcon} />}
      {isValidCenter && !isExact && (
        <Circle
          center={mapCenter}
          radius={500}
          pathOptions={{ 
            stroke: false, 
            fillColor: '#000', 
            fillOpacity: 0.20,
            interactive: false 
          }}
        />
      )}
    </MapContainer>
  );
}

export default Map;
