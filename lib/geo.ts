import { safeListing } from "@/types/listing";

export type LocationData = {
    latlng?: unknown;
    [key: string]: unknown;
};

export const toRadians = (value: number) => (value * Math.PI) / 180;

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * Returns distance in kilometers.
 */
export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Extracts latitude and longitude from a listing's location metadata.
 * Prioritizes privacy-safe jittered coordinates over exact values.
 */
export const getListingLatLng = (listing: safeListing): [number, number] | null => {
    const actualLocation = listing.actualLocation as LocationData | null | undefined;
    if (!actualLocation || typeof actualLocation !== "object") return null;

    // Prefer privacy-safe jittered latlng if available
    const latlng = actualLocation.latlng;
    if (Array.isArray(latlng) && latlng.length >= 2) {
        const jLat = Number(latlng[0]);
        const jLng = Number(latlng[1]);
        if (Number.isFinite(jLat) && Number.isFinite(jLng)) {
            return [jLat, jLng];
        }
    }

    // Fallback to exact lat/lng for legacy listings
    const exactLat = Number(actualLocation.lat);
    const exactLng = Number(actualLocation.lng);
    if (Number.isFinite(exactLat) && Number.isFinite(exactLng)) {
        return [exactLat, exactLng];
    }

    return null;
};
