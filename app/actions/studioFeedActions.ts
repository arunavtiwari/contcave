"use server";

import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { isLatLng } from "@/lib/geo";
import { BROWSE_SORTS, DEFAULT_BROWSE_SORT } from "@/lib/listing/browseSort";
import { findRegion } from "@/lib/listing/regions";
import { ListingService } from "@/lib/listing/service";
import { studioFeedFiltersSchema } from "@/schemas/listing";

const loadMoreStudiosSchema = z.object({
    filters: studioFeedFiltersSchema,
    origin: z.tuple([z.number(), z.number()]).refine(isLatLng, "Invalid origin").nullable(),
    region: z.string().max(60).nullable().optional(),
    order: z.enum(BROWSE_SORTS).optional(),
    cursor: z.string().min(1).max(512),
});

// Later pages keep the order the first page was built with: the cursor only carries the keys
// that order sorts on, so reading it back under a different one would page incorrectly.
export const loadMoreStudios = createAction(
    loadMoreStudiosSchema,
    {},
    async ({ filters, origin, region, order, cursor }) =>
        ListingService.getListingFeedPage({
            filters,
            sort: { origin, region: findRegion(region)?.slug ?? null, order: order ?? DEFAULT_BROWSE_SORT },
            cursor,
        })
);
