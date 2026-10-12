import "server-only";

import { cookies, headers } from "next/headers";

import getCurrentUser from "@/app/actions/getCurrentUser";
import type { LatLng } from "@/lib/geo";
import { isBotRequest } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import type { BrowseLocation } from "./browseLocation";
import { type BrowseSort, DEFAULT_BROWSE_SORT } from "./browseSort";
import type { FeedSortContext } from "./feedQuery";
import { findRegion, regionOfCity, regionOfPoint } from "./regions";
import { parseSavedSearchLocation, parseSearchLocationCookie, SEARCH_LOCATION_COOKIE } from "./searchLocation";
import { ListingService } from "./service";

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
 * The location the visitor actually chose: a place searched in the URL (`near`) first, then one
 * they picked earlier (cookie, then their profile). An IP city is deliberately not a choice -
 * Indian ISP gateways resolve to the wrong locality, so IP only ever picks a metro region for
 * ordering and must never show up in the location control as something the visitor set.
 */
export async function pickedBrowseLocation(
    filters: StudioFeedFilters,
    placeLabel?: string
): Promise<BrowseLocation | null> {
    if (filters.near) {
        return {
            label: placeLabel ?? "Selected area",
            placeId: null,
            lat: filters.near[0],
            lng: filters.near[1],
            region: regionOfPoint(filters.near)?.slug ?? null,
            source: "search",
        };
    }

    const [cookieStore, currentUser] = await Promise.all([cookies(), getCurrentUser().catch(() => null)]);
    return (
        parseSearchLocationCookie(cookieStore.get(SEARCH_LOCATION_COOKIE)?.value) ??
        parseSavedSearchLocation(currentUser?.searchLocation)
    );
}

/**
 * Where the visitor is, in priority order:
 *   1. a location they picked (see `pickedBrowseLocation`),
 *   2. the IP city, only to pick a served metro region; IP is never used for distance,
 *   3. nothing: default verified-first order.
 */
async function resolveFeedSort(
    filters: StudioFeedFilters,
    placeLabel: string | undefined,
    order: BrowseSort
): Promise<FeedSortContext> {
    const picked = await pickedBrowseLocation(filters, placeLabel);
    if (picked) {
        const origin: LatLng = [picked.lat, picked.lng];
        return { region: findRegion(picked.region)?.slug ?? null, origin, order };
    }

    const headerList = await headers();
    const region = isBotRequest(headerList) ? null : regionOfCity(ipCity(headerList));
    return { region: region?.slug ?? null, origin: null, order };
}

export async function loadStudioFeed(
    filters: StudioFeedFilters,
    { page = 1, placeLabel, order = DEFAULT_BROWSE_SORT }: { page?: number; placeLabel?: string; order?: BrowseSort } = {}
) {
    // Nearest-first needs somewhere to measure from; without a location it is the default order.
    const sort = await resolveFeedSort(filters, placeLabel, order);
    const appliedOrder = order === "distance" && !sort.origin ? DEFAULT_BROWSE_SORT : order;

    return {
        filters,
        order: appliedOrder,
        page: await ListingService.getListingFeedPage({ filters, sort: { ...sort, order: appliedOrder }, page }),
        nearLabel: filters.near ? placeLabel : undefined,
    };
}
