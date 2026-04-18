const JITTER_METERS = 250;

/**
 * Clamps a number between a minimum and maximum value.
 */
export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

/**
 * Jitters a latitude and longitude pair for privacy by roughly 250 meters.
 */
export const jitterLatLng = (latlng: unknown): [number, number] | null => {
    if (!Array.isArray(latlng) || latlng.length < 2) return null;
    const lat = Number(latlng[0]);
    const lng = Number(latlng[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const r = JITTER_METERS / 111320;
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(-2 * Math.log(u));
    const t = 2 * Math.PI * v;
    const dLat = w * Math.cos(t);
    const dLng = (w * Math.sin(t)) / Math.cos((lat * Math.PI) / 180);
    const jLat = clamp(lat + dLat, -90, 90);
    const jLng = clamp(lng + dLng, -180, 180);
    return [jLat, jLng];
};
