import "server-only";

import { queueSearchReindex } from "@/lib/search/reindex";

/**
 * Side effects that follow a studio's listing or reviews changing. Cached studio data is dropped by
 * the Prisma client itself (see lib/listing/studioCacheInvalidation.ts), so this only queues the
 * studio's search re-index.
 */
export async function studioChanged(listingId: string): Promise<void> {
    await queueSearchReindex(listingId);
}
