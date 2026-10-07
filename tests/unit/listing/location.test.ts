import { describe, expect, it } from "vitest";

import type { LatLng } from "@/lib/geo";
import { resolveListingLocation } from "@/lib/listing/location";

describe("resolveListingLocation", () => {
    it("resolves listing locations without drifting or inventing coordinates", () => {
        const stored = { latlng: [28.6374, 77.1386], label: "Delhi", state: "Delhi" };

        const relabelled = resolveListingLocation({ ...stored, label: "New Delhi" }, stored);
        expect(relabelled.actualLocation?.latlng).toEqual(stored.latlng);
        expect(relabelled.locationPoint).toEqual({ type: "Point", coordinates: [77.1386, 28.6374] });
        expect(relabelled.propertyStateCode).toBe("07");

        const moved = resolveListingLocation({ latlng: [30.7046, 76.7179], state: "Punjab" }, stored);
        const [lat, lng] = moved.actualLocation?.latlng as LatLng;
        expect(Math.abs(lat - 30.7046)).toBeLessThan(0.02);
        expect(Math.abs(lng - 76.7179)).toBeLessThan(0.02);
        expect([lat, lng]).not.toEqual([30.7046, 76.7179]);
        expect(moved.locationPoint?.coordinates).toEqual([lng, lat]);

        expect(resolveListingLocation({ latlng: [0, 0], label: "x" }, stored).actualLocation?.latlng).toEqual(stored.latlng);
        expect(resolveListingLocation({ latlng: "bad" }).locationPoint).toBeNull();
        expect(resolveListingLocation(null, stored)).toEqual({ actualLocation: null, locationPoint: null });
    });
});
