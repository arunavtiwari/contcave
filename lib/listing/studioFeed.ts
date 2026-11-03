import "server-only";

import { cookies, headers } from "next/headers";
import { userAgent } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";

import type { BrowseLocation } from "./browseLocation";
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
    placeLabel?: string
): Promise<{ sort: FeedSortContext; location: FeedLocationSummary | null }> {
    const picked = await pickedBrowseLocation(filters, placeLabel);
    if (picked) {
        const origin: LatLng = [picked.lat, picked.lng];
        const region = findRegion(picked.region);
        return {
            sort: { region: region?.slug ?? null, origin },
            location: {
                label: picked.label,
                regionName: region?.name ?? null,
                source: filters.near ? "search" : "saved",
            },
        };
    }

    const headerList = await headers();
    const isBot = userAgent({ headers: headerList }).isBot || isHtmlOnlyCrawler(headerList.get("user-agent"));
    const region = isBot ? null : regionOfCity(ipCity(headerList));
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
