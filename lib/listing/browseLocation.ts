import { isLatLng, type LatLng } from "@/lib/geo";

/**
 * The browsing location, as the location control owns it. One object is the single source of
 * truth for the header search, the desktop combobox and the mobile sheet; it is mirrored into
 * the URL (`near` + `place`), the `cc_location` cookie, localStorage and the signed-in profile.
 *
 * `source` records how it was chosen, which is what the analytics events report. It never
 * comes from an IP lookup: Indian ISP gateways resolve to the wrong locality, so an IP only
 * ever picks a metro region for ordering and is not treated as a choice the visitor made.
 */
export const BROWSE_LOCATION_SOURCES = ["gps", "search", "recent", "popular"] as const;

export type BrowseLocationSource = (typeof BROWSE_LOCATION_SOURCES)[number];

export type BrowseLocation = {
    label: string;
    placeId: string | null;
    lat: number;
    lng: number;
    /** Region slug from lib/listing/regions.ts, e.g. "delhi-ncr". */
    region: string | null;
    source: BrowseLocationSource;
};

export const browseLatLng = (location: BrowseLocation): LatLng => [location.lat, location.lng];

export const RECENT_LOCATIONS_STORAGE_KEY = "cc_recent_locations";
export const MAX_RECENT_LOCATIONS = 3;

/** Shown when the picker opens with an empty input. Edit this list to change the chips. */
export const POPULAR_AREAS: ReadonlyArray<{ label: string; secondary: string; latlng: LatLng }> = [
    { label: "Noida", secondary: "Uttar Pradesh", latlng: [28.5355, 77.391] },
    { label: "Gurugram", secondary: "Haryana", latlng: [28.4595, 77.0266] },
    { label: "South Delhi", secondary: "Delhi", latlng: [28.5245, 77.2066] },
    { label: "Andheri West", secondary: "Mumbai, Maharashtra", latlng: [19.1364, 72.8296] },
    { label: "Bandra West", secondary: "Mumbai, Maharashtra", latlng: [19.0606, 72.8365] },
    { label: "Malviya Nagar", secondary: "Jaipur, Rajasthan", latlng: [26.8505, 75.8054] },
    { label: "Mohali", secondary: "Punjab", latlng: [30.7046, 76.7179] },
    { label: "Gomti Nagar", secondary: "Lucknow, Uttar Pradesh", latlng: [26.8537, 81.0074] },
];

const METRE_STEP = 50;
const DECIMAL_LIMIT_KM = 10;

/**
 * Distance as a studio card shows it: metres under a kilometre, one decimal up to 10 km,
 * whole kilometres beyond that - precision the reader can act on, and no more.
 */
export function formatDistanceKm(km: number): string {
    if (!Number.isFinite(km) || km < 0) return "";
    if (km < 1) return `${Math.max(METRE_STEP, Math.round((km * 1000) / METRE_STEP) * METRE_STEP)} m`;
    if (km <= DECIMAL_LIMIT_KM) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
}

const isBrowseLocation = (value: unknown): value is BrowseLocation => {
    const candidate = value as Partial<BrowseLocation> | null;
    return Boolean(
        candidate &&
        typeof candidate.label === "string" &&
        candidate.label.trim() &&
        isLatLng([candidate.lat, candidate.lng] as unknown)
    );
};

/** Last few places picked, newest first. Unreadable or half-written entries are dropped. */
export function readRecentLocations(): BrowseLocation[] {
    try {
        const raw = window.localStorage.getItem(RECENT_LOCATIONS_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isBrowseLocation).slice(0, MAX_RECENT_LOCATIONS);
    } catch {
        return [];
    }
}

const sameLocation = (a: BrowseLocation, b: BrowseLocation) =>
    a.placeId && b.placeId
        ? a.placeId === b.placeId
        : a.label.trim().toLowerCase() === b.label.trim().toLowerCase();

/** Moves a pick to the front of the recents and returns the new list. */
export function pushRecentLocation(location: BrowseLocation): BrowseLocation[] {
    const next = [location, ...readRecentLocations().filter((entry) => !sameLocation(entry, location))].slice(
        0,
        MAX_RECENT_LOCATIONS
    );
    try {
        window.localStorage.setItem(RECENT_LOCATIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage can be unavailable (private mode); recents are a convenience, not state we need.
    }
    return next;
}
