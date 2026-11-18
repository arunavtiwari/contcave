import { describe, expect, it, vi } from "vitest";

import { parsePlacesResponse, type PlaceMatch, PlacesError, searchPlace } from "@/lib/places";
import { acceptedArea } from "@/lib/search/area";

const DELHI: [number, number] = [28.6139, 77.209];

const place = (overrides: Partial<PlaceMatch> = {}): PlaceMatch => ({
    placeId: "pitampura",
    name: "Pitampura",
    address: "Pitampura, Delhi, India",
    latlng: [28.7003, 77.1406],
    types: ["sublocality_level_1", "sublocality", "political"],
    ...overrides,
});

const body = {
    status: "OK",
    results: [{ place_id: "p1", name: "Pitampura", formatted_address: "Pitampura, Delhi, India", geometry: { location: { lat: 28.7003, lng: 77.1406 } }, types: ["sublocality"] }],
};

describe("parsePlacesResponse", () => {
    it("reads the first place with its id, name, point and types", () => {
        expect(parsePlacesResponse(200, body)).toEqual({
            placeId: "p1",
            name: "Pitampura",
            address: "Pitampura, Delhi, India",
            latlng: [28.7003, 77.1406],
            types: ["sublocality"],
        });
    });

    it("returns null when nothing was found and throws on API errors", () => {
        expect(parsePlacesResponse(200, { status: "ZERO_RESULTS", results: [] })).toBeNull();
        expect(() => parsePlacesResponse(200, { status: "REQUEST_DENIED", error_message: "bad key" })).toThrow(PlacesError);
        expect(() => parsePlacesResponse(500, {})).toThrow(PlacesError);
    });

    it("asks Places for Indian results, biased towards the city", async () => {
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body)));
        await searchPlace("Pitampura, Delhi, India", "key", { centre: DELHI, radiusKm: 60 }, fetchImpl as unknown as typeof fetch);
        const [url] = fetchImpl.mock.calls[0] as unknown as [string];
        const params = new URL(url).searchParams;
        expect(Object.fromEntries(params)).toMatchObject({
            query: "Pitampura, Delhi, India",
            region: "in",
            key: "key",
            location: "28.6139,77.209",
            radius: "50000",
        });
    });
});

describe("acceptedArea", () => {
    it("places an area whose name matches what was typed, spaces and case aside", () => {
        expect(acceptedArea(place(), "pitampura", DELHI)).toEqual([28.7003, 77.1406]);
        expect(acceptedArea(place({ name: "Gomti Nagar", latlng: [26.85, 81] }), "gomtinagar", null)).toEqual([26.85, 81]);
    });

    it("refuses a different place, so a misspelling is never read as somewhere else", () => {
        expect(acceptedArea(place(), "Pritampura", DELHI)).toBeNull();
    });

    it("refuses a whole state or district", () => {
        expect(acceptedArea(place({ name: "Delhi", types: ["administrative_area_level_1", "political"] }), "delhi", DELHI)).toBeNull();
    });

    it("refuses a place too far from the city searched, and accepts it when no city was named", () => {
        const kolkata = place({ name: "Salt Lake", latlng: [22.58, 88.41] });
        expect(acceptedArea(kolkata, "salt lake", DELHI)).toBeNull();
        expect(acceptedArea(kolkata, "salt lake", null)).toEqual([22.58, 88.41]);
    });

    it("refuses a place outside India", () => {
        expect(acceptedArea(place({ name: "Pitampura", address: "Pitampura, London, UK", latlng: [51.5, -0.12] }), "pitampura", null)).toBeNull();
    });

    it("places nothing when Google found nothing", () => {
        expect(acceptedArea(null, "pitampura", DELHI)).toBeNull();
    });
});
