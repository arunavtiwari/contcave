"use server";

import { z } from "zod";

import { headers } from "next/headers";

import { createAction } from "@/lib/actions-utils";
import { isLatLng } from "@/lib/geo";
import { getIpLocation } from "@/lib/http/requestMeta";
import { ListingService } from "@/lib/listing/service";
import { studioFeedFiltersSchema } from "@/schemas/listing";

const loadMoreStudiosSchema = z.object({
    filters: studioFeedFiltersSchema,
    origin: z.tuple([z.number(), z.number()]).refine(isLatLng, "Invalid origin").nullable(),
    cursor: z.string().min(1).max(512),
});

export const loadMoreStudios = createAction(loadMoreStudiosSchema, {}, async ({ filters, origin, cursor }) =>
    ListingService.getListingFeedPage({ filters, origin, cursor })
);

export const getVisitorLocationAction = createAction(z.object({}), {}, async () => {
    const headerList = await headers();
    return getIpLocation(headerList);
});

