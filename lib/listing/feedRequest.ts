import { pagePath, type SearchParams } from "@/lib/pagination";

export const FEED_API_PATH = "/api/listings/feed";

/** Landing pages fix their own place and category; the studios page reads filters from the URL. */
export type FeedLanding = { place: string; category: string | null };

export const LANDING_PARAM = "landing";
export const LANDING_CATEGORY_PARAM = "landingCategory";

export function feedRequestPath(page: number, searchParams: SearchParams, landing?: FeedLanding) {
    return pagePath(FEED_API_PATH, page, {
        ...searchParams,
        [LANDING_PARAM]: landing?.place,
        [LANDING_CATEGORY_PARAM]: landing?.category ?? undefined,
    });
}

export function landingOf(searchParams: SearchParams): FeedLanding | null {
    const place = searchParams[LANDING_PARAM];
    if (typeof place !== "string" || !place) return null;
    const category = searchParams[LANDING_CATEGORY_PARAM];
    return { place, category: typeof category === "string" && category ? category : null };
}

/** Adds the next page, dropping studios already shown (ranking ties can shift between requests). */
export function appendUnique<T extends { id: string }>(shown: T[], next: T[]): T[] {
    const seen = new Set(shown.map((item) => item.id));
    return [...shown, ...next.filter((item) => !seen.has(item.id))];
}

/** The page whose first card has scrolled past `line`; `starts` are each loaded page's first-card tops, in order. */
export function pageAtLine(starts: { page: number; top: number }[], line: number): number | null {
    let current: number | null = null;
    for (const start of starts) {
        if (start.top > line) break;
        current = start.page;
    }
    return current ?? starts[0]?.page ?? null;
}
