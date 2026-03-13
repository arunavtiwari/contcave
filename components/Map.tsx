"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Flag from "react-world-flags";

type IconDefaultWithUrl = L.Icon.Default & { _getIconUrl?: string };
delete (L.Icon.Default.prototype as unknown as IconDefaultWithUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  center?: number[];
  locationValue?: string;
};

function Map({ center, locationValue }: Props) {
  const isValidCenter = Array.isArray(center) && 
    center.length >= 2 &&
    typeof center[0] === 'number' &&
    typeof center[1] === 'number' &&
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
      className="h-[35vh] rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {isValidCenter && (
        <Marker position={mapCenter}>
          {locationValue && (
            <Popup>
              <div className="flex justify-center items-center animate-bounce">
                <Flag code={locationValue} className="w-10" />
              </div>
            </Popup>
          )}
        </Marker>
      )}
    </MapContainer>
  );
}

export default Map;
