export type LatLng = [number, number];

export type Nearby = {
    latlng: LatLng;
    label: string;
};

export const CURRENT_LOCATION_LABEL = "nearby";

const NEARBY_RADIUS_KM = 150;

export const isLatLng = (value: unknown): value is LatLng =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180 &&
    !(value[0] === 0 && value[1] === 0);

export const nearLabelFor = ({ label }: Nearby, nearestKm: number | null) =>
    nearestKm !== null && nearestKm <= NEARBY_RADIUS_KM ? label : undefined;

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng) {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

const SEARCH_RADIUS_KM = { min: 15, max: 50 };

export const searchRadiusKm = (radius?: number | null) =>
    Math.round(Math.min(SEARCH_RADIUS_KM.max, Math.max(SEARCH_RADIUS_KM.min, Number(radius) || 0)));

export const formatLatLngParam = ([lat, lng]: LatLng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

export function parseLatLngParam(value?: string | null): LatLng | null {
    const latlng = value?.split(",").map((part) => Number(part.trim()));
    return isLatLng(latlng) ? latlng : null;
}

const MAX_PLACE_LABEL = 80;

export const parsePlaceLabelParam = (value?: string | null) => value?.trim().slice(0, MAX_PLACE_LABEL) || undefined;

