import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";

export const studioFeedKey = (filters: StudioFeedFilters, origin: LatLng | null) => JSON.stringify([filters, origin]);
