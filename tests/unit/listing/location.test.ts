import { describe, expect, it } from "vitest";

import type { LatLng } from "@/lib/geo";
import { applyAddressChoice, applyCityChoice, resolveListingLocation } from "@/lib/listing/location";

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

    it("keeps the pin of a listing saved before addresses were stored", () => {
        const legacy = { latlng: [28.6374, 77.1386], label: "Delhi" };
        const saved = resolveListingLocation({ label: "Delhi", display_name: "12 Main Road, Delhi" }, legacy);
        expect(saved.actualLocation?.latlng).toEqual(legacy.latlng);
    });

    it("drops the pin when a different address arrives without one", () => {
        const stored = { latlng: [28.6374, 77.1386], display_name: "Old Road, Delhi" };
        expect(resolveListingLocation({ display_name: "New Road, Delhi" }, stored).locationPoint).toBeNull();
    });

    it("never keeps an old pin for a different address", () => {
        const stored = { display_name: "Prahlad Vihar, Rohini, Delhi", latlng: [28.7412, 77.0855], state: "Delhi" };

        const newAddressWithoutPoint = resolveListingLocation({ display_name: "Pitampura, New Delhi", state: "Delhi" }, stored);
        expect(newAddressWithoutPoint.locationPoint).toBeNull();
        expect(newAddressWithoutPoint.actualLocation?.latlng).toBeNull();

        const sameAddressWithoutPoint = resolveListingLocation({ display_name: stored.display_name, label: "Delhi", state: "Delhi" }, stored);
        expect(sameAddressWithoutPoint.actualLocation?.latlng).toEqual(stored.latlng);
    });
});

describe("location form changes", () => {
    const DELHI_CENTRE = [28.6139, 77.209];
    const city = { value: "Delhi", label: "Delhi", state: "Delhi", region: "North", latlng: DELHI_CENTRE };
    const pitampura = {
        display_name: "Pitampura, New Delhi, Delhi, India",
        latlng: [28.7003, 77.1406] as LatLng,
        placeId: "ChIJ_pitampura",
    };

    it("choosing a city after the address leaves the address and its pin alone", () => {
        const withAddress = applyAddressChoice({ value: "Delhi", label: "Delhi", state: "Delhi" }, pitampura);
        const afterCityChange = applyCityChoice(withAddress, city);

        expect(afterCityChange.latlng).toEqual(pitampura.latlng);
        expect(afterCityChange.display_name).toBe(pitampura.display_name);
        expect(afterCityChange.placeId).toBe(pitampura.placeId);
        expect(afterCityChange.value).toBe("Delhi");
        expect(afterCityChange.state).toBe("Delhi");
    });

    it("choosing a city never supplies a pin", () => {
        const fresh = applyCityChoice(null, city);

        expect(fresh.value).toBe("Delhi");
        expect(fresh.latlng).toBeUndefined();
    });

    it("an address and its pin always change together", () => {
        const before = applyAddressChoice(null, pitampura);
        const after = applyAddressChoice(before, { display_name: "Hauz Khas, New Delhi", latlng: [28.5494, 77.2001] });

        expect(after.display_name).toBe("Hauz Khas, New Delhi");
        expect(after.latlng).toEqual([28.5494, 77.2001]);
        expect(after.placeId).toBeUndefined();

        const withoutPoint = applyAddressChoice(before, { display_name: "Somewhere Else" });
        expect(withoutPoint.display_name).toBe("Somewhere Else");
        expect(withoutPoint.latlng).toBeUndefined();
    });
});
