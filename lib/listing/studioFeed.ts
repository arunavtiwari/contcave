import "server-only";

import { headers } from "next/headers";

import { type Nearby, nearLabelFor } from "@/lib/geo";
import { getIpLocation, isBotRequest } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import { ListingService } from "./service";

async function getVisitorOrigin(): Promise<Nearby | null> {
    const headerList = await headers();
    if (isBotRequest(headerList)) return null;
    return getIpLocation(headerList);
}

export async function loadStudioFeed(filters: StudioFeedFilters, { page = 1, placeLabel }: { page?: number; placeLabel?: string } = {}) {
    const visitor = filters.near ? null : await getVisitorOrigin();
    const origin = filters.near ?? visitor?.latlng ?? null;
    const feed = await ListingService.getListingFeedPage({ filters, origin, page });

    return {
        page: feed,
        nearLabel: filters.near
            ? placeLabel
            : visitor && feed.origin ? nearLabelFor(visitor, feed.nearestKm) : undefined,
    };
}
