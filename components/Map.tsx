"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

type Props = {
  center?: [number, number];
};

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

function MapViewportController({
  center,
  zoom,
  shouldFocus,
}: {
  center: [number, number];
  zoom: number;
  shouldFocus: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!shouldFocus) {
      map.flyTo(INDIA_CENTER, 4, { duration: 0.8, easeLinearity: 0.25 });
      return;
    }

    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [center, map, shouldFocus, zoom]);

  return null;
}

function Map({ center }: Props) {
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
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={false}
      preferCanvas
      className="z-0 h-[35vh] w-full rounded-xl"
    >
      <MapViewportController
        center={mapCenter}
        zoom={isValidCenter ? 15 : 4}
        shouldFocus={isValidCenter}
      />
      <TileLayer
        url={TILE_URL}
        maxZoom={19}
        detectRetina
      />

      {isValidCenter && <Marker position={mapCenter} icon={customIcon} />}
    </MapContainer>
  );
}

export default Map;
