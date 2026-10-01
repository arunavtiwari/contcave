export type LatLng = [number, number];

export type Nearby = {
    latlng: LatLng;
    label: string;
    approximate?: boolean;
};

export const NEARBY_COOKIE = "cc_nearby";
export const CURRENT_LOCATION_LABEL = "you";

const APPROXIMATE_RADIUS_KM = 150;
const MAX_LABEL_LENGTH = 80;

export const isLatLng = (value: unknown): value is LatLng =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180 &&
    !(value[0] === 0 && value[1] === 0);

export const nearLabelFor = ({ label, approximate }: Nearby, nearestKm: number | null) =>
    nearestKm !== null && (!approximate || nearestKm <= APPROXIMATE_RADIUS_KM) ? label : undefined;

export const serializeNearby = ({ latlng, label }: Nearby) =>
    encodeURIComponent(JSON.stringify({
        latlng: latlng.map((n) => Number(n.toFixed(2))),
        label: label.slice(0, MAX_LABEL_LENGTH),
    }));

export function parseNearby(value: string | undefined): Nearby | null {
    if (!value) return null;
    try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== "object") return null;
        const { latlng, label } = parsed as Record<string, unknown>;
        if (!isLatLng(latlng) || typeof label !== "string") return null;
        const trimmed = label.trim().slice(0, MAX_LABEL_LENGTH);
        return trimmed ? { latlng, label: trimmed } : null;
    } catch {
        return null;
    }
}
