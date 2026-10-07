import "server-only";

import { cookies, headers } from "next/headers";

import getCurrentUser from "@/app/actions/getCurrentUser";
import type { LatLng } from "@/lib/geo";
import { isBotRequest } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import type { FeedSortContext } from "./feedQuery";
import { findRegion, regionOfCity, regionOfPoint } from "./regions";
import { type FeedLocationSummary, parseSavedSearchLocation, parseSearchLocationCookie, SEARCH_LOCATION_COOKIE } from "./searchLocation";
import { ListingService } from "./service";
import { studioFeedKey } from "./studioFeedKey";

const IP_CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity"] as const;

function ipCity(headerList: Headers): string | null {
    for (const name of IP_CITY_HEADERS) {
        const value = headerList.get(name);
        if (!value) continue;
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }
    return null;
}

/**
 * Where the visitor is, in priority order:
 *   1. a place searched in the URL (`near`),
 *   2. a location they chose (cookie, then their profile),
 *   3. the IP city, only to pick a served metro region; IP is never used for distance
 *      because Indian ISP gateways resolve to the wrong locality,
 *   4. nothing: default verified-first order.
 */
async function resolveFeedSort(
    filters: StudioFeedFilters,
    placeLabel?: string
): Promise<{ sort: FeedSortContext; location: FeedLocationSummary | null }> {
    if (filters.near) {
        const region = regionOfPoint(filters.near);
        return {
            sort: { region: region?.slug ?? null, origin: filters.near },
            location: { label: placeLabel ?? "Selected area", regionName: region?.name ?? null, source: "search" },
        };
    }

    const [cookieStore, headerList, currentUser] = await Promise.all([cookies(), headers(), getCurrentUser().catch(() => null)]);
    const saved = parseSearchLocationCookie(cookieStore.get(SEARCH_LOCATION_COOKIE)?.value)
        ?? parseSavedSearchLocation(currentUser?.searchLocation);
    if (saved) {
        const origin: LatLng = [saved.lat, saved.lng];
        const region = findRegion(saved.region);
        return {
            sort: { region: region?.slug ?? null, origin },
            location: { label: saved.label, regionName: region?.name ?? null, source: "saved" },
        };
    }

    const region = isBotRequest(headerList) ? null : regionOfCity(ipCity(headerList));
    if (region) {
        return {
            sort: { region: region.slug, origin: null },
            location: { label: region.name, regionName: region.name, source: "ip" },
        };
    }

    return { sort: { region: null, origin: null }, location: null };
}

export async function loadStudioFeed(filters: StudioFeedFilters, placeLabel?: string) {
    const { sort, location } = await resolveFeedSort(filters, placeLabel);
    const page = await ListingService.getListingFeedPage({ filters, sort });

    return {
        key: studioFeedKey(filters, page.origin, page.region),
        filters,
        page,
        location,
        nearLabel: filters.near ? placeLabel : undefined,
    };
}
