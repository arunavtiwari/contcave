import type { BrowseLocation } from "./browseLocation";
import {
    parseSavedSearchLocation,
    SEARCH_LOCATION_COOKIE,
    SEARCH_LOCATION_MAX_AGE_SECONDS,
    SEARCH_LOCATION_STORAGE_KEY,
    serializeSearchLocation,
} from "./searchLocation";

/**
 * Where a browsing location is kept on the client: the cookie the server sorts the first page
 * by, and localStorage as a mirror for when the cookie expires. The signed-in profile is written
 * separately, through a server action.
 *
 * Its own module so both the navbar search and the browse controls write through the same code
 * and can't end up holding different locations - and so neither of the two modules it draws on
 * has to depend on the other.
 */

/** Saves a pick everywhere it is remembered, or forgets it when given null. */
export function persistBrowseLocation(location: BrowseLocation | null) {
    document.cookie = location
        ? `${SEARCH_LOCATION_COOKIE}=${serializeSearchLocation(location)}; path=/; max-age=${SEARCH_LOCATION_MAX_AGE_SECONDS}; SameSite=Lax`
        : `${SEARCH_LOCATION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    try {
        if (location) window.localStorage.setItem(SEARCH_LOCATION_STORAGE_KEY, JSON.stringify(location));
        else window.localStorage.removeItem(SEARCH_LOCATION_STORAGE_KEY);
    } catch {
        // Storage can be unavailable (private mode); the cookie still carries the choice.
    }
}

export function readStoredBrowseLocation(): BrowseLocation | null {
    try {
        const raw = window.localStorage.getItem(SEARCH_LOCATION_STORAGE_KEY);
        return raw ? parseSavedSearchLocation(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}
