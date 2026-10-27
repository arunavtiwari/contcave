import { z } from "zod";

import { isLatLng, type LatLng } from "@/lib/geo";

import { findRegion, regionOfPoint } from "./regions";

/**
 * A browsing location the visitor chose (GPS or an entered place). Stored in a cookie so the
 * server can sort the first page by it, mirrored in localStorage, and on the profile when logged in.
 * IP lookups never write here, so they can't override a choice.
 */
export const SEARCH_LOCATION_COOKIE = "cc_location";
export const SEARCH_LOCATION_STORAGE_KEY = "cc_location";
export const SEARCH_LOCATION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type SavedSearchLocation = {
    label: string;
    lat: number;
    lng: number;
    region: string | null;
};

const savedSearchLocationSchema = z.object({
    label: z.string().trim().min(1).max(120),
    lat: z.number(),
    lng: z.number(),
    region: z.string().max(60).nullable().optional(),
});

/** Validates a stored location; the region is re-derived so a stale or forged slug can't stick. */
export function parseSavedSearchLocation(value: unknown): SavedSearchLocation | null {
    const parsed = savedSearchLocationSchema.safeParse(value);
    if (!parsed.success) return null;
    const latlng: LatLng = [parsed.data.lat, parsed.data.lng];
    if (!isLatLng(latlng)) return null;
    return {
        label: parsed.data.label,
        lat: latlng[0],
        lng: latlng[1],
        region: regionOfPoint(latlng)?.slug ?? findRegion(parsed.data.region)?.slug ?? null,
    };
}

export function parseSearchLocationCookie(raw: string | undefined | null): SavedSearchLocation | null {
    if (!raw) return null;
    try {
        return parseSavedSearchLocation(JSON.parse(decodeURIComponent(raw)));
    } catch {
        return null;
    }
}

export const serializeSearchLocation = (location: SavedSearchLocation) => encodeURIComponent(JSON.stringify(location));

/** What the location bar shows: the region name when we serve the area, else the place label. */
export type FeedLocationSummary = {
    label: string;
    regionName: string | null;
    source: "search" | "saved" | "ip";
};
