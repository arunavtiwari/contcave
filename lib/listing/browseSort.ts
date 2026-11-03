/**
 * How the studio feed is ordered. `recommended` is the relevance order built in
 * lib/listing/feedQuery.ts (region, then verified/curated weight, then quality, then distance);
 * every other option replaces that order with a single explicit key.
 */
export const BROWSE_SORTS = ["recommended", "distance", "price_asc", "price_desc", "rating"] as const;

export type BrowseSort = (typeof BROWSE_SORTS)[number];

export const DEFAULT_BROWSE_SORT: BrowseSort = "recommended";

export const BROWSE_SORT_LABELS: Record<BrowseSort, string> = {
    recommended: "Recommended",
    distance: "Nearest first",
    price_asc: "Price: low to high",
    price_desc: "Price: high to low",
    rating: "Top rated",
};

/** Shown on the sort button, which has room for less than the menu row does. */
export const BROWSE_SORT_SHORT_LABELS: Record<BrowseSort, string> = {
    recommended: "Recommended",
    distance: "Nearest",
    price_asc: "Price ↑",
    price_desc: "Price ↓",
    rating: "Top rated",
};

/** Sorts that mean nothing without a location: choosing one opens the picker instead. */
export const SORT_NEEDS_LOCATION: ReadonlySet<BrowseSort> = new Set<BrowseSort>(["distance"]);

const isBrowseSort = (value: string): value is BrowseSort => BROWSE_SORTS.includes(value as BrowseSort);

export function parseBrowseSort(value?: string | string[] | null): BrowseSort {
    const first = Array.isArray(value) ? value[0] : value;
    const trimmed = first?.trim();
    return trimmed && isBrowseSort(trimmed) ? trimmed : DEFAULT_BROWSE_SORT;
}
