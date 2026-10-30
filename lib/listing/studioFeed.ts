import "server-only";

import { cookies, headers } from "next/headers";

import getCurrentUser from "@/app/actions/getCurrentUser";
import type { LatLng } from "@/lib/geo";
import { getIpLocation, isBotRequest } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import type { FeedSortContext } from "./feedQuery";
import { findRegion, nearestRegion, regionOfPoint } from "./regions";
import { type FeedLocationSummary, parseSavedSearchLocation, parseSearchLocationCookie, SEARCH_LOCATION_COOKIE } from "./searchLocation";
import { ListingService } from "./service";

/**
 * Where the visitor is, in priority order:
 *   1. a place searched in the URL (`near`),
 *   2. a location they chose (cookie, then their profile),
 *   3. the IP location, first visits only: nearest served region first, then city-scale
 *      distance, because IP is right to the city but not the locality. The bar names the
 *      region only when the visitor is inside one,
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

    const visitor = isBotRequest(headerList) ? null : getIpLocation(headerList);
    if (visitor) {
        const region = regionOfPoint(visitor.latlng);
        return {
            sort: { region: (region ?? nearestRegion(visitor.latlng))?.slug ?? null, origin: visitor.latlng, approximate: true },
            location: region ? { label: region.name, regionName: region.name, source: "ip" } : null,
        };
    }

    return { sort: { region: null, origin: null }, location: null };
}

export async function loadStudioFeed(filters: StudioFeedFilters, { page = 1, placeLabel }: { page?: number; placeLabel?: string } = {}) {
    const { sort, location } = await resolveFeedSort(filters, placeLabel);

    return {
        page: await ListingService.getListingFeedPage({ filters, sort, page }),
        location,
        nearLabel: filters.near ? placeLabel : undefined,
    };
}
