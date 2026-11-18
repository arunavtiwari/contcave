import { getGstStateCodeFromStateName } from "@/constants/gstStateCodes";
import { INDIAN_CITIES } from "@/hooks/useCities";
import { distanceKm, isLatLng, type LatLng } from "@/lib/geo";
import type { LocationSchema } from "@/schemas/listing";

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

const addressOf = (location: unknown): string | undefined => {
    const name = (location as { display_name?: unknown } | null | undefined)?.display_name;
    return typeof name === "string" ? name : undefined;
};

const sameLatLng = (a: LatLng, b: LatLng) => a[0] === b[0] && a[1] === b[1];

export type LocationDraft = Omit<Partial<LocationSchema>, "latlng"> & { latlng?: LatLng };

export type CityChoice = { value: string; label: string; state: string; region?: string };

export type PlaceChoice = { display_name: string; latlng?: LatLng; placeId?: string };

export function applyCityChoice(current: LocationDraft | null | undefined, city: CityChoice & { latlng?: unknown }): LocationDraft {
    const { value, label, state, region } = city;
    return { ...current, value, label, state, ...(region ? { region } : {}) };
}

export function applyAddressChoice(current: LocationDraft | null | undefined, place: PlaceChoice): LocationDraft {
    const { display_name: _address, latlng: _pin, placeId: _placeId, ...rest } = current ?? {};
    return {
        ...rest,
        display_name: place.display_name,
        ...(place.latlng ? { latlng: place.latlng } : {}),
        ...(place.placeId ? { placeId: place.placeId } : {}),
    };
}

export function resolveListingLocation(incoming: LocationInput | null, stored?: unknown): ResolvedListingLocation {
    if (!incoming) return { actualLocation: null, locationPoint: null };

    const requested = storedLatLng(incoming);
    const previous = storedLatLng(stored);
    const incomingAddress = addressOf(incoming);
    const storedAddress = addressOf(stored);
    const keepsPrevious = previous !== null
        && (incomingAddress === undefined || storedAddress === undefined || incomingAddress === storedAddress);
    const latlng = requested
        ? previous && sameLatLng(requested, previous) ? previous : jitterLatLng(requested)
        : keepsPrevious ? previous : null;
    const state = typeof incoming.state === "string" ? incoming.state : undefined;
    const statedCode = typeof incoming.propertyStateCode === "string" ? incoming.propertyStateCode : undefined;

    return {
        actualLocation: { ...incoming, latlng },
        locationPoint: latlng ? toGeoPoint(latlng) : null,
        propertyStateCode: statedCode || getGstStateCodeFromStateName(state) || undefined,
    };
}

/** How far from a city's centre an address can be and still count as that city (suburbs included). */
export const CITY_MATCH_RADIUS_KM = 60;

type PickedLocation = { value?: string; label?: string; display_name?: string; latlng?: unknown } | null | undefined;

export const listingLocationValue = (location: PickedLocation) =>
    location?.value || location?.label || location?.display_name || "";

export function listingLocationIssues(location: PickedLocation): { city?: string; address?: string } {
    if (!location?.value) return { city: "Please select a city" };
    if (!location.display_name) return { address: "Please enter a complete address" };
    if (!isLatLng(location.latlng)) {
        return { address: "Please select a valid location using autocomplete to fetch map coordinates" };
    }
    const cityCentre = INDIAN_CITIES.find((city) => city.value === location.value)?.latlng;
    if (isLatLng(cityCentre) && distanceKm(location.latlng, cityCentre) > CITY_MATCH_RADIUS_KM) {
        return { address: `This address isn't in ${location.label || location.value}. Pick the matching city or address.` };
    }
    return {};
}
