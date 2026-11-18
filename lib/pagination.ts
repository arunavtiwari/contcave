import { redirect } from "next/navigation";

import { TITLE_LENGTH } from "@/lib/seo";

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_PARAM = "page";

const MAX_PAGE = 500;

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

export function searchParamsOf(query: URLSearchParams): SearchParams {
    const params: SearchParams = {};
    for (const key of new Set(query.keys())) {
        const values = query.getAll(key);
        params[key] = values.length > 1 ? values : values[0];
    }
    return params;
}

export function pagePath(path: string, page: number, searchParams: SearchParams = {}) {
    const { [PAGE_PARAM]: _page, ...rest } = searchParams;
    return `${path}${toQueryString({ ...rest, [PAGE_PARAM]: page > 1 ? String(page) : undefined })}`;
}

export function pageTitle(titles: string[], page: number) {
    const options = titles.map((title) => (page > 1 ? `${title} – Page ${page}` : title));
    return options.find((option) => option.length <= TITLE_LENGTH) ?? options[options.length - 1];
}

export function redirectPastLastPage(isEmpty: boolean, page: number, firstPage: string) {
    if (isEmpty && page > 1) redirect(firstPage);
}
