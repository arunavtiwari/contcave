import "server-only";

import { unstable_cache } from "next/cache";

import { distanceKm, type LatLng } from "@/lib/geo";
import { ANOTHER_CITY_KM } from "@/lib/listing/regions";
import { type PlaceMatch, placesApiKey, searchPlace } from "@/lib/places";

const TOO_BROAD = new Set(["country", "administrative_area_level_1", "administrative_area_level_2"]);

const CACHE_SECONDS = 30 * 24 * 60 * 60;

const INDIA_BOUNDS = { south: 6.5, north: 35.7, west: 68.1, east: 97.4 };

const inIndia = ([lat, lng]: LatLng) =>
    lat >= INDIA_BOUNDS.south && lat <= INDIA_BOUNDS.north && lng >= INDIA_BOUNDS.west && lng <= INDIA_BOUNDS.east;

const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

const sameName = (typed: string, found: string) => {
    const [a, b] = [compact(typed), compact(found)];
    return Boolean(a && b) && (a === b || a.includes(b) || b.includes(a));
};

export function acceptedArea(place: PlaceMatch | null, typed: string, cityCentre: LatLng | null): LatLng | null {
    if (!place || !sameName(typed, place.name)) return null;
    if (!inIndia(place.latlng) || place.types.some((type) => TOO_BROAD.has(type))) return null;
    if (cityCentre && distanceKm(place.latlng, cityCentre) > ANOTHER_CITY_KM) return null;
    return place.latlng;
}

const lookup = unstable_cache(
    async (area: string, city: string | null, centre: LatLng | null) => {
        const apiKey = placesApiKey();
        if (!apiKey) return null;
        const query = [area, city, "India"].filter(Boolean).join(", ");
        return searchPlace(query, apiKey, centre ? { centre, radiusKm: ANOTHER_CITY_KM } : null);
    },
    ["search-area-places-v1"],
    { revalidate: CACHE_SECONDS },
);

export async function locateArea(area: string, city: string | null, cityCentre: LatLng | null): Promise<LatLng | null> {
    if (!placesApiKey()) {
        console.warn("[ai-search] GOOGLE_MAPS_SERVER_API_KEY is not set; areas can't be placed on the map.");
        return null;
    }
    try {
        const place = await lookup(area.trim().toLowerCase(), city?.trim().toLowerCase() ?? null, cityCentre);
        return acceptedArea(place, area, cityCentre);
    } catch (error) {
        console.error("[ai-search] Place search failed; searching the whole city.", error);
        return null;
    }
}
