import "server-only";

import { headers } from "next/headers";

import { type Nearby, nearLabelFor } from "@/lib/geo";
import { getIpLocation, isBotRequest } from "@/lib/http/requestMeta";
import type { StudioFeedFilters } from "@/schemas/listing";

import { ListingService } from "./service";
import { studioFeedKey } from "./studioFeedKey";

async function getVisitorOrigin(): Promise<Nearby | null> {
    const headerList = await headers();
    if (isBotRequest(headerList)) return null;
    return getIpLocation(headerList);
}

export async function loadStudioFeed(filters: StudioFeedFilters, placeLabel?: string) {
    const visitor = filters.near ? null : await getVisitorOrigin();
    const origin = filters.near ?? visitor?.latlng ?? null;
    const page = await ListingService.getListingFeedPage({ filters, origin });

    return {
        key: studioFeedKey(filters, page.origin),
        filters,
        page,
        nearLabel: filters.near
            ? placeLabel
            : visitor && page.origin ? nearLabelFor(visitor, page.nearestKm) : undefined,
    };
}
