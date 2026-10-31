import "server-only";

import { scheduleQstashJob } from "@/lib/cron/qstash";
import { SEARCH_CONFIG } from "@/lib/search/config";

export function queueSearchReindex(listingId: string) {
    const window = SEARCH_CONFIG.reindexDebounceMs;
    const runAt = new Date((Math.floor(Date.now() / window) + 1) * window);
    return scheduleQstashJob({ job: "search-index-listing", listingId }, runAt);
}
