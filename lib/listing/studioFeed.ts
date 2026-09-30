import "server-only";

import { cookies, headers } from "next/headers";
import { userAgent } from "next/server";

import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import { type Nearby, NEARBY_COOKIE, nearLabelFor, parseNearby } from "@/lib/geo";
import { getIpLocation } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import { ListingService } from "./service";

async function getVisitorOrigin(): Promise<Nearby | null> {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    if (userAgent({ headers: headerList }).isBot || isHtmlOnlyCrawler(headerList.get("user-agent"))) return null;
    return parseNearby(cookieStore.get(NEARBY_COOKIE)?.value) ?? getIpLocation(headerList);
}

export async function loadStudioFeed(filters: StudioFeedFilters) {
    const visitor = await getVisitorOrigin();
    const page = await ListingService.getListingFeedPage({ filters, origin: visitor?.latlng ?? null });

    return {
        key: JSON.stringify([filters, page.origin]),
        filters,
        page,
        nearLabel: visitor && page.origin ? nearLabelFor(visitor, page.nearestKm) : undefined,
    };
}
