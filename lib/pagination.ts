import { redirect } from "next/navigation";

import { TITLE_LENGTH } from "@/lib/seo";

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_PARAM = "page";

const MAX_PAGE = 500;
const ALL_PAGES_UP_TO = 7;

export function pageFromParams(searchParams: SearchParams) {
    const value = searchParams[PAGE_PARAM];
    const page = Number(Array.isArray(value) ? value[0] : value);
    return Number.isInteger(page) && page > 1 && page <= MAX_PAGE ? page : 1;
}

export function toQueryString(searchParams: SearchParams) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (value === undefined) continue;
        for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry);
    }
    const search = query.toString();
    return search ? `?${search}` : "";
}

export function pagePath(path: string, page: number, searchParams: SearchParams = {}) {
    const { [PAGE_PARAM]: _page, ...rest } = searchParams;
    return `${path}${toQueryString({ ...rest, [PAGE_PARAM]: page > 1 ? String(page) : undefined })}`;
}

export function pageTitle(titles: string[], page: number) {
    const options = titles.map((title) => (page > 1 ? `${title} – Page ${page}` : title));
    return options.find((option) => option.length <= TITLE_LENGTH) ?? options[options.length - 1];
}

export function paginationRange(page: number, totalPages: number): (number | null)[] {
    if (totalPages <= ALL_PAGES_UP_TO) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const anchors = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
        .filter((candidate) => candidate >= 1 && candidate <= totalPages)
        .sort((a, b) => a - b);

    return anchors.flatMap((current, index) => {
        const previous = anchors[index - 1];
        if (previous === undefined || current - previous === 1) return [current];
        return current - previous === 2 ? [previous + 1, current] : [null, current];
    });
}

export function redirectPastLastPage(isEmpty: boolean, page: number, firstPage: string) {
    if (isEmpty && page > 1) redirect(firstPage);
}
