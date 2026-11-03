"use client";

import { usePathname, useSearchParams } from "next/navigation";
import qs from "query-string";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { saveSearchLocationAction } from "@/app/actions/searchLocationActions";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { GooglePlacesProvider, useGooglePlaces } from "@/hooks/useGooglePlaces";
import { trackLocationCleared, trackLocationSet, trackSortChanged } from "@/lib/analytics/tracking";
import { formatLatLngParam, type LatLng, parseLatLngParam, parsePlaceLabelParam } from "@/lib/geo";
import {
    browseLatLng,
    type BrowseLocation,
    pushRecentLocation,
    readRecentLocations,
} from "@/lib/listing/browseLocation";
import { type BrowseSort, DEFAULT_BROWSE_SORT, parseBrowseSort, SORT_NEEDS_LOCATION } from "@/lib/listing/browseSort";
import { regionOfPoint } from "@/lib/listing/regions";
import {
    parseSavedSearchLocation,
    SEARCH_LOCATION_COOKIE,
    SEARCH_LOCATION_MAX_AGE_SECONDS,
    SEARCH_LOCATION_STORAGE_KEY,
    serializeSearchLocation,
} from "@/lib/listing/searchLocation";

/** The grid scrolls back into view after a pick changes the results underneath it. */
export const BROWSE_GRID_ANCHOR_ID = "studio-grid";

const GPS_TIMEOUT_MS = 10_000;
const GPS_MAX_AGE_MS = 5 * 60_000;
/** How long a detect will wait for the Maps script before naming the point from the region table. */
const GEOCODER_WAIT_MS = 3_000;
const GRID_SCROLL_MARGIN = 24;

export type DetectState = "idle" | "locating" | "denied" | "unavailable";

type BrowseLocationContextValue = {
    location: BrowseLocation | null;
    sort: BrowseSort;
    recents: BrowseLocation[];
    pickerOpen: boolean;
    detectState: DetectState;
    /** True while a navigation triggered by this control is still in flight. */
    isPending: boolean;
    openPicker: () => void;
    closePicker: () => void;
    setLocation: (location: BrowseLocation) => void;
    clearLocation: () => void;
    setSort: (sort: BrowseSort) => void;
    detect: () => void;
    cancelDetect: () => void;
    dismissDetectError: () => void;
};

const BrowseLocationContext = createContext<BrowseLocationContextValue | null>(null);

function writeCookie(location: BrowseLocation | null) {
    document.cookie = location
        ? `${SEARCH_LOCATION_COOKIE}=${serializeSearchLocation(location)}; path=/; max-age=${SEARCH_LOCATION_MAX_AGE_SECONDS}; SameSite=Lax`
        : `${SEARCH_LOCATION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function writeStorage(location: BrowseLocation | null) {
    try {
        if (location) window.localStorage.setItem(SEARCH_LOCATION_STORAGE_KEY, JSON.stringify(location));
        else window.localStorage.removeItem(SEARCH_LOCATION_STORAGE_KEY);
    } catch {
        // Storage can be unavailable (private mode); the cookie still carries the choice.
    }
}

function readStorage(): BrowseLocation | null {
    try {
        const raw = window.localStorage.getItem(SEARCH_LOCATION_STORAGE_KEY);
        return raw ? parseSavedSearchLocation(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

/** Scrolls up to the grid, never down - a pick shouldn't push the controls off-screen. */
function scrollToGrid() {
    const grid = document.getElementById(BROWSE_GRID_ANCHOR_ID);
    if (!grid) return;
    const top = grid.getBoundingClientRect().top + window.scrollY - GRID_SCROLL_MARGIN;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

const locationKey = (location: BrowseLocation | null) =>
    location ? `${location.label}|${location.lat.toFixed(4)},${location.lng.toFixed(4)}` : "";

type ProviderProps = {
    /** Resolved server-side from the cookie or the signed-in profile. An IP city is never a pick. */
    initialLocation: BrowseLocation | null;
    isLoggedIn: boolean;
    children: ReactNode;
};

export function BrowseLocationProvider({ initialLocation, isLoggedIn, children }: ProviderProps) {
    return (
        <GooglePlacesProvider>
            <BrowseLocationState initialLocation={initialLocation} isLoggedIn={isLoggedIn}>
                {children}
            </BrowseLocationState>
        </GooglePlacesProvider>
    );
}

function BrowseLocationState({ initialLocation, isLoggedIn, children }: ProviderProps) {
    const params = useSearchParams();
    const pathname = usePathname();
    const { navigate, replace, refresh, isPending } = useFilterNavigation();
    const places = useGooglePlaces();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [detectState, setDetectState] = useState<DetectState>("idle");
    const [recents, setRecents] = useState<BrowseLocation[]>([]);
    // `undefined` means "no local change yet, use what the server resolved".
    const [optimistic, setOptimistic] = useState<BrowseLocation | null | undefined>(undefined);
    const gpsRequest = useRef<{ cancelled: boolean } | null>(null);

    useEffect(() => setRecents(readRecentLocations()), []);

    const sort = parseBrowseSort(params?.get("sort"));

    // The URL wins over the cookie, so a shared link reproduces the same results.
    const urlLocation = useMemo<BrowseLocation | null>(() => {
        const near = parseLatLngParam(params?.get("near"));
        if (!near) return null;
        return {
            label: parsePlaceLabelParam(params?.get("place")) ?? "Selected area",
            placeId: null,
            lat: near[0],
            lng: near[1],
            region: regionOfPoint(near)?.slug ?? null,
            source: "search",
        };
    }, [params]);

    const serverLocation = urlLocation ?? initialLocation;
    const serverKey = locationKey(serverLocation);

    // Once the server catches up with an optimistic change, stop overriding it.
    useEffect(() => setOptimistic(undefined), [serverKey]);

    const location = optimistic !== undefined ? optimistic : serverLocation;

    // The cookie can expire while localStorage survives. Restoring it keeps a choice the visitor
    // made from quietly reverting to the IP-derived region on their next visit.
    const restored = useRef(false);
    useEffect(() => {
        if (restored.current || serverLocation) return;
        restored.current = true;
        const stored = readStorage();
        if (!stored) return;
        writeCookie(stored);
        setOptimistic(stored);
        refresh();
    }, [serverLocation, refresh]);

    const buildHref = useCallback(
        (changes: Record<string, string | undefined>) => {
            const query = qs.parse(params?.toString() ?? "");
            for (const [key, value] of Object.entries(changes)) {
                if (value === undefined) delete query[key];
                else query[key] = value;
            }
            return qs.stringifyUrl({ url: pathname || "/studios", query }, { skipNull: true, skipEmptyString: true });
        },
        [params, pathname]
    );

    const closePicker = useCallback(() => setPickerOpen(false), []);

    const openPicker = useCallback(() => {
        places.load();
        setPickerOpen(true);
    }, [places]);

    const setLocation = useCallback(
        (next: BrowseLocation) => {
            setOptimistic(next);
            setRecents(pushRecentLocation(next));
            writeCookie(next);
            writeStorage(next);
            setPickerOpen(false);
            setDetectState("idle");
            trackLocationSet(next.source);
            // Setting a location is a request to see the closest studios, so the order follows it.
            // `km` is dropped: the location sorts the feed, it doesn't narrow it.
            navigate(
                buildHref({
                    near: formatLatLngParam(browseLatLng(next)),
                    place: next.label,
                    sort: "distance",
                    km: undefined,
                })
            );
            scrollToGrid();
            if (isLoggedIn) void saveSearchLocationAction({ location: next }).catch(() => undefined);
        },
        [buildHref, isLoggedIn, navigate]
    );

    const clearLocation = useCallback(() => {
        setOptimistic(null);
        writeCookie(null);
        writeStorage(null);
        setPickerOpen(false);
        setDetectState("idle");
        trackLocationCleared();
        navigate(buildHref({ near: undefined, place: undefined, km: undefined, sort: undefined }));
        if (isLoggedIn) void saveSearchLocationAction({ location: null }).catch(() => undefined);
    }, [buildHref, isLoggedIn, navigate]);

    const setSort = useCallback(
        (next: BrowseSort) => {
            if (SORT_NEEDS_LOCATION.has(next) && !location) {
                openPicker();
                return;
            }
            trackSortChanged(next);
            replace(buildHref({ sort: next === DEFAULT_BROWSE_SORT ? undefined : next }));
        },
        [buildHref, location, openPicker, replace]
    );

    const cancelDetect = useCallback(() => {
        if (gpsRequest.current) gpsRequest.current.cancelled = true;
        gpsRequest.current = null;
        setDetectState("idle");
    }, []);

    const dismissDetectError = useCallback(() => setDetectState("idle"), []);

    const detect = useCallback(() => {
        places.load();
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setDetectState("unavailable");
            return;
        }

        const request = { cancelled: false };
        gpsRequest.current = request;
        setDetectState("locating");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (request.cancelled) return;
                const latlng: LatLng = [position.coords.latitude, position.coords.longitude];
                // A named area beats a region ("Sector 63", not "Delhi NCR"), but only if the
                // geocoder arrives in time; the region table is the offline fallback.
                await places.whenReady(GEOCODER_WAIT_MS);
                const described = request.cancelled ? null : await places.describePoint(latlng);
                if (request.cancelled) return;
                gpsRequest.current = null;
                setLocation({
                    label: described ?? regionOfPoint(latlng)?.name ?? "Your location",
                    placeId: null,
                    lat: latlng[0],
                    lng: latlng[1],
                    region: regionOfPoint(latlng)?.slug ?? null,
                    source: "gps",
                });
            },
            (error) => {
                if (request.cancelled) return;
                gpsRequest.current = null;
                setDetectState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
            },
            { enableHighAccuracy: false, timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS }
        );
    }, [places, setLocation]);

    const value = useMemo<BrowseLocationContextValue>(
        () => ({
            location,
            sort,
            recents,
            pickerOpen,
            detectState,
            isPending,
            openPicker,
            closePicker,
            setLocation,
            clearLocation,
            setSort,
            detect,
            cancelDetect,
            dismissDetectError,
        }),
        [
            location,
            sort,
            recents,
            pickerOpen,
            detectState,
            isPending,
            openPicker,
            closePicker,
            setLocation,
            clearLocation,
            setSort,
            detect,
            cancelDetect,
            dismissDetectError,
        ]
    );

    return <BrowseLocationContext.Provider value={value}>{children}</BrowseLocationContext.Provider>;
}

export function useBrowseLocation() {
    const context = useContext(BrowseLocationContext);
    if (!context) throw new Error("useBrowseLocation must be used within a BrowseLocationProvider");
    return context;
}
