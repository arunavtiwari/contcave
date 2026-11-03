import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";

import { type BrowseSort,DEFAULT_BROWSE_SORT } from "./browseSort";

/** Identifies a feed, so already-loaded pages are only reused for an identical one. */
export const studioFeedKey = (
    filters: StudioFeedFilters,
    origin: LatLng | null,
    region: string | null = null,
    order: BrowseSort = DEFAULT_BROWSE_SORT
) => JSON.stringify([filters, origin, region, order]);
