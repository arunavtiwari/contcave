import "server-only";

import { after } from "next/server";

import { scheduleQstashJob } from "@/lib/cron/qstash";
import { SEARCH_CONFIG } from "@/lib/search/config";

export async function queueSearchReindex(listingId: string): Promise<void> {
    const window = SEARCH_CONFIG.reindexDebounceMs;
    const runAt = new Date((Math.floor(Date.now() / window) + 1) * window);
    const queue = async () => {
        await scheduleQstashJob({ job: "search-index-listing", listingId }, runAt);
    };
    try {
        after(queue);
    } catch {
        await queue();
    }
}
