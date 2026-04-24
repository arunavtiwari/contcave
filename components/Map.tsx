"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

const customIcon = L.icon({
  iconUrl: "/images/icons/marker.png",
  iconRetinaUrl: "/images/icons/marker.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  shadowUrl: "",
});

function FlyToMarker({ center }: { center: L.LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, {
      animate: true,
      duration: 1.5,
    });
  }, [center, map]);
  return null;
}

type Props = {
  center?: [number, number];
  locationValue?: string;
};

function Map({ center }: Props) {
  const isValidCenter =
    Array.isArray(center) &&
    center.length >= 2 &&
    Number.isFinite(center[0]) &&
    Number.isFinite(center[1]);

  const mapCenter: L.LatLngExpression = isValidCenter
    ? [center[0], center[1]]
    : [20.5937, 78.9629];

  return (
    <MapContainer
      center={mapCenter}
      zoom={isValidCenter ? 14 : 4}
      scrollWheelZoom={false}
      attributionControl={false}
      preferCanvas={true}
      className="h-[35vh] w-full rounded-xl z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {isValidCenter && (
        <>
          <FlyToMarker center={mapCenter} />
          <Marker position={mapCenter} icon={customIcon} />
        </>
      )}
    </MapContainer>
  );
}

export default Map;
