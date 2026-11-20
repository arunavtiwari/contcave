import { getGstStateCodeFromStateName } from "@/constants/gstStateCodes";
import { isLatLng, type LatLng } from "@/lib/geo";

import { jitterLatLng } from "./utils";

export type GeoPoint = { type: "Point"; coordinates: [number, number] };

type LocationInput = Record<string, unknown>;

export type ResolvedListingLocation = {
    actualLocation: LocationInput | null;
    locationPoint: GeoPoint | null;
    propertyStateCode?: string;
};

export const toGeoPoint = ([lat, lng]: LatLng): GeoPoint => ({ type: "Point", coordinates: [lng, lat] });

const storedLatLng = (location: unknown): LatLng | null => {
    const latlng = (location as { latlng?: unknown } | null | undefined)?.latlng;
    return isLatLng(latlng) ? latlng : null;
};

const sameLatLng = (a: LatLng, b: LatLng) => a[0] === b[0] && a[1] === b[1];

export function resolveListingLocation(incoming: LocationInput | null, stored?: unknown): ResolvedListingLocation {
    if (!incoming) return { actualLocation: null, locationPoint: null };

    const requested = storedLatLng(incoming);
    const previous = storedLatLng(stored);
    const latlng = requested
        ? previous && sameLatLng(requested, previous) ? previous : jitterLatLng(requested)
        : previous;
    const state = typeof incoming.state === "string" ? incoming.state : undefined;
    const statedCode = typeof incoming.propertyStateCode === "string" ? incoming.propertyStateCode : undefined;

    return {
        actualLocation: { ...incoming, latlng },
        locationPoint: latlng ? toGeoPoint(latlng) : null,
        propertyStateCode: statedCode || getGstStateCodeFromStateName(state) || undefined,
    };
}

type PickedLocation = { value?: string; label?: string; display_name?: string; latlng?: unknown } | null | undefined;

export const listingLocationValue = (location: PickedLocation) =>
    location?.value || location?.label || location?.display_name || "";

export function listingLocationIssues(location: PickedLocation): { city?: string; address?: string } {
    if (!location?.value) return { city: "Please select a city" };
    if (!location.display_name) return { address: "Please enter a complete address" };
    if (!isLatLng(location.latlng)) {
        return { address: "Please select a valid location using autocomplete to fetch map coordinates" };
    }
    return {};
}
