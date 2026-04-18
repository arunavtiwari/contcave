"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import Flag from "react-world-flags";

type IconDefaultWithUrl = L.Icon.Default & { _getIconUrl?: string };
delete (L.Icon.Default.prototype as unknown as IconDefaultWithUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/icons/marker.png",
  iconRetinaUrl: "/icons/marker.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

function FlyToMarker({ center }: { center: L.LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 10);
  }, [center, map]);
  return null;
}

type Props = {
  center?: [number, number];
  locationValue?: string;
};

function Map({ center, locationValue }: Props) {
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
      zoom={isValidCenter ? 10 : 4}
      scrollWheelZoom={false}
      attributionControl={false}
      className="h-[35vh] w-full rounded-lg z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {isValidCenter && (
        <>
          <FlyToMarker center={mapCenter} />
          <Marker position={mapCenter}>
            {locationValue && (
              <Popup>
                <div className="flex justify-center items-center animate-bounce">
                  <Flag code={locationValue} className="w-10" />
                </div>
              </Popup>
            )}
          </Marker>
        </>
      )}
    </MapContainer>
  );
}

export default Map;