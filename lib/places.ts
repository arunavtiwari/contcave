import { isLatLng, type LatLng } from "@/lib/geo";

export type PlaceMatch = {
    placeId: string;
    name: string;
    address: string;
    latlng: LatLng;
    types: string[];
};

export type SearchBias = { centre: LatLng; radiusKm: number };

export class PlacesError extends Error {}

const TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const MAX_BIAS_METRES = 50_000;

export const placesApiKey = () => process.env.GOOGLE_MAPS_SERVER_API_KEY || null;

export function textSearchUrl(query: string, apiKey: string, bias: SearchBias | null = null): string {
    const params = new URLSearchParams({ query, region: "in", language: "en", key: apiKey });
    if (bias) {
        params.set("location", `${bias.centre[0]},${bias.centre[1]}`);
        params.set("radius", String(Math.min(bias.radiusKm * 1000, MAX_BIAS_METRES)));
    }
    return `${TEXT_SEARCH_URL}?${params}`;
}

export async function searchPlace(
    query: string,
    apiKey: string,
    bias: SearchBias | null = null,
    fetchImpl: typeof fetch = fetch,
): Promise<PlaceMatch | null> {
    const response = await fetchImpl(textSearchUrl(query, apiKey, bias));
    return parsePlacesResponse(response.status, await response.json());
}

export function parsePlacesResponse(status: number, body: unknown): PlaceMatch | null {
    const response = body as {
        status?: string;
        error_message?: string;
        results?: Array<{
            place_id?: string;
            name?: string;
            formatted_address?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
            types?: string[];
        }>;
    };
    if (status !== 200 || (response.status !== "OK" && response.status !== "ZERO_RESULTS")) {
        throw new PlacesError(`${response.status ?? `HTTP ${status}`}: ${response.error_message ?? "place search failed"}`);
    }

    const [first] = response.results ?? [];
    const latlng = [first?.geometry?.location?.lat, first?.geometry?.location?.lng];
    if (!first?.place_id || !isLatLng(latlng)) return null;
    return {
        placeId: first.place_id,
        name: first.name ?? "",
        address: first.formatted_address ?? "",
        latlng,
        types: first.types ?? [],
    };
}
