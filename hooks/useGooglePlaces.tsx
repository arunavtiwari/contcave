"use client";

import { type Libraries, useLoadScript } from "@react-google-maps/api";
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

import type { LatLng } from "@/lib/geo";

const LIBRARIES: Libraries = ["places"];

/**
 * Areas only. The old autocomplete asked for `geocode` + `establishment`, which is why searching
 * "Noida" offered Noida International Airport and Noida City Centre Bus Stand - a studio search
 * wants the area, never the landmark inside it.
 */
const AREA_TYPES = ["locality", "sublocality", "neighborhood"];
const SUBLOCALITY_LEVELS = ["sublocality_level_1", "sublocality_level_2"];

export const MIN_SUGGESTION_CHARS = 2;
export const SUGGESTION_DEBOUNCE_MS = 250;

export type AreaSuggestion = {
    placeId: string;
    /** The area name, e.g. "Sector 63". */
    main: string;
    /** Where it is, e.g. "Noida, Uttar Pradesh". */
    secondary: string;
};

export type ResolvedPlace = { placeId: string; label: string; latlng: LatLng };

export type PlacesStatus = "idle" | "loading" | "ready" | "error";

export type SuggestionResult = { ok: true; suggestions: AreaSuggestion[] } | { ok: false };

type GooglePlaces = {
    status: PlacesStatus;
    /** Fetches the Maps script if it isn't on the page yet. Safe to call repeatedly. */
    load: () => void;
    /** Resolves true once the services exist, false if the wait times out or loading failed. */
    whenReady: (timeoutMs: number) => Promise<boolean>;
    suggestAreas: (input: string) => Promise<SuggestionResult>;
    resolvePlace: (suggestion: AreaSuggestion) => Promise<ResolvedPlace | null>;
    describePoint: (point: LatLng) => Promise<string | null>;
};

const GooglePlacesContext = createContext<GooglePlaces | null>(null);

/** Loads the script, and only once something has asked for it. */
function PlacesScript({ apiKey, onReady, onError }: { apiKey: string; onReady: () => void; onError: () => void }) {
    const libraries = useMemo(() => LIBRARIES, []);
    const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries });

    useEffect(() => {
        if (isLoaded) onReady();
    }, [isLoaded, onReady]);

    useEffect(() => {
        if (loadError) onError();
    }, [loadError, onError]);

    return null;
}

/**
 * Google Places for the location picker, loaded on demand. The script is ~100KB and most
 * visitors never open the picker, so nothing is fetched until `load()` is called - on input
 * focus, or when the detect button needs the geocoder to name a point.
 */
export function GooglePlacesProvider({ children }: { children: ReactNode }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || "";
    const [requested, setRequested] = useState(false);
    const [status, setStatus] = useState<PlacesStatus>(apiKey ? "idle" : "error");

    const autocomplete = useRef<google.maps.places.AutocompleteService | null>(null);
    const places = useRef<google.maps.places.PlacesService | null>(null);
    const geocoder = useRef<google.maps.Geocoder | null>(null);
    // One token per search session bills the predictions as a single session; it is retired
    // once a place is picked, which is what closes the session.
    const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

    const statusRef = useRef(status);
    statusRef.current = status;
    const readyWaiters = useRef<Array<(ready: boolean) => void>>([]);

    const settleWaiters = useCallback((ready: boolean) => {
        const waiters = readyWaiters.current;
        readyWaiters.current = [];
        for (const waiter of waiters) waiter(ready);
    }, []);

    const load = useCallback(() => {
        if (!apiKey) return;
        setRequested(true);
        setStatus((current) => (current === "idle" ? "loading" : current));
    }, [apiKey]);

    const handleReady = useCallback(() => {
        autocomplete.current ??= new google.maps.places.AutocompleteService();
        places.current ??= new google.maps.places.PlacesService(document.createElement("div"));
        geocoder.current ??= new google.maps.Geocoder();
        setStatus("ready");
        settleWaiters(true);
    }, [settleWaiters]);

    const handleError = useCallback(() => {
        setStatus("error");
        settleWaiters(false);
    }, [settleWaiters]);

    const whenReady = useCallback(
        (timeoutMs: number) =>
            new Promise<boolean>((resolve) => {
                if (statusRef.current === "ready") return resolve(true);
                if (statusRef.current === "error") return resolve(false);
                const timer = setTimeout(() => resolve(false), timeoutMs);
                readyWaiters.current.push((ready) => {
                    clearTimeout(timer);
                    resolve(ready);
                });
            }),
        []
    );

    const suggestAreas = useCallback(
        (input: string): Promise<SuggestionResult> =>
            new Promise((resolve) => {
                const service = autocomplete.current;
                if (!service) return resolve({ ok: true, suggestions: [] });
                if (input.trim().length < MIN_SUGGESTION_CHARS) return resolve({ ok: true, suggestions: [] });
                sessionToken.current ??= new google.maps.places.AutocompleteSessionToken();

                service.getPlacePredictions(
                    {
                        input: input.trim(),
                        types: AREA_TYPES,
                        componentRestrictions: { country: "in" },
                        sessionToken: sessionToken.current,
                    },
                    (predictions, requestStatus) => {
                        const { OK, ZERO_RESULTS } = google.maps.places.PlacesServiceStatus;
                        if (requestStatus === ZERO_RESULTS) return resolve({ ok: true, suggestions: [] });
                        if (requestStatus !== OK || !predictions) return resolve({ ok: false });
                        resolve({
                            ok: true,
                            suggestions: predictions.map((prediction) => ({
                                placeId: prediction.place_id,
                                main: prediction.structured_formatting.main_text,
                                secondary: prediction.structured_formatting.secondary_text ?? "",
                            })),
                        });
                    }
                );
            }),
        []
    );

    const resolvePlace = useCallback(
        (suggestion: AreaSuggestion): Promise<ResolvedPlace | null> =>
            new Promise((resolve) => {
                const service = places.current;
                if (!service) return resolve(null);
                service.getDetails(
                    { placeId: suggestion.placeId, fields: ["geometry"], sessionToken: sessionToken.current ?? undefined },
                    (place, requestStatus) => {
                        sessionToken.current = null;
                        const point = place?.geometry?.location;
                        if (requestStatus !== google.maps.places.PlacesServiceStatus.OK || !point) return resolve(null);
                        resolve({ placeId: suggestion.placeId, label: suggestion.main, latlng: [point.lat(), point.lng()] });
                    }
                );
            }),
        []
    );

    /** Names a GPS point as an area, so the pill reads "Sector 63" and not a region or a lat/lng. */
    const describePoint = useCallback(([lat, lng]: LatLng): Promise<string | null> => {
        const service = geocoder.current;
        if (!service) return Promise.resolve(null);
        return service
            .geocode({ location: { lat, lng } })
            .then(({ results }) => {
                const components = results[0]?.address_components ?? [];
                const match = [...AREA_TYPES, ...SUBLOCALITY_LEVELS]
                    .map((type) => components.find((component) => component.types.includes(type)))
                    .find(Boolean);
                return match?.long_name ?? null;
            })
            .catch(() => null);
    }, []);

    const value = useMemo<GooglePlaces>(
        () => ({ status, load, whenReady, suggestAreas, resolvePlace, describePoint }),
        [status, load, whenReady, suggestAreas, resolvePlace, describePoint]
    );

    return (
        <GooglePlacesContext.Provider value={value}>
            {requested && apiKey && <PlacesScript apiKey={apiKey} onReady={handleReady} onError={handleError} />}
            {children}
        </GooglePlacesContext.Provider>
    );
}

export function useGooglePlaces() {
    const context = useContext(GooglePlacesContext);
    if (!context) throw new Error("useGooglePlaces must be used within a GooglePlacesProvider");
    return context;
}
