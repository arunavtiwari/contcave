import type { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { parseBrowseSort } from "@/lib/listing/browseSort";
import { landingOf } from "@/lib/listing/feedRequest";
import { loadPlaceRoute, placeFeedFilters } from "@/lib/listing/placePage";
import { feedFiltersOf, loadStudioFeed, placeLabelOf } from "@/lib/listing/studioFeed";
import { pageFromParams, searchParamsOf } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = searchParamsOf(request.nextUrl.searchParams);
    const page = pageFromParams(searchParams);

    const landing = landingOf(searchParams);
    const route = landing ? await loadPlaceRoute(landing.place, landing.category) : null;
    if (landing && !(route && "page" in route)) return createErrorResponse("Unknown landing page", 404);

    const feed = await loadStudioFeed(
      route && "page" in route ? placeFeedFilters(route.page) : feedFiltersOf(searchParams),
      { page, placeLabel: landing ? undefined : placeLabelOf(searchParams), order: parseBrowseSort(searchParams.sort) }
    );

    const response = createSuccessResponse({ items: feed.page.items, totalPages: feed.page.totalPages });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return handleRouteError(error, "GET /api/listings/feed");
  }
}
