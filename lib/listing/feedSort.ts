export const FEED_SORT_LABELS = {
    price_asc: "Price: low to high",
    price_desc: "Price: high to low",
} as const;

export type FeedSort = keyof typeof FEED_SORT_LABELS;

export const FEED_SORTS = Object.keys(FEED_SORT_LABELS) as FeedSort[];

export const parseFeedSort = (value: string | null | undefined): FeedSort | undefined =>
    FEED_SORTS.find((sort) => sort === value);
