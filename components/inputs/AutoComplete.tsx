'use client';

import { Libraries, StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

const LIBRARIES: Libraries = ['places'];

type LatLngTuple = [number, number];
type E2ETestWindow = Window & { __CONTCAVE_E2E__?: boolean };

export interface AutoCompleteValue {
  display_name: string;
  latlng: LatLngTuple;
}

interface AutoCompleteProps {
  value?: string;
  onChange: (value: AutoCompleteValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function AutoComplete({
  value,
  onChange,
  placeholder = 'Search for a location',
  disabled = false,
  className = '',
}: AutoCompleteProps) {
  const inputId = useId();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '';
  const isE2ETestMode =
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true" ||
    (typeof window !== "undefined" &&
      Boolean((window as E2ETestWindow).__CONTCAVE_E2E__));

  const [query, setQuery] = useState(value ?? '');
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const libraries = useMemo(() => LIBRARIES, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (typeof value === 'string') setQuery(value);
  }, [value]);

  const handleLoad = useCallback((ref: google.maps.places.SearchBox) => {
    searchBoxRef.current = ref;
  }, []);

  const handleUnmount = useCallback(() => {
    searchBoxRef.current = null;
  }, []);

  const handlePlacesChanged = useCallback(() => {
    const places = searchBoxRef.current?.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    const loc = place.geometry?.location;
    if (!loc) return;

    const display =
      place.formatted_address?.trim() ||
      place.name?.trim() ||
      '';

    if (!display) return;

    const next: AutoCompleteValue = {
      display_name: display,
      latlng: [loc.lat(), loc.lng()],
    };

    setQuery(display);
    onChange(next);
  }, [onChange]);

  if (isE2ETestMode) {
    return (
      <div className={`relative ${className}`}>
        <label htmlFor={inputId} className="sr-only">
          Location search
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          data-testid="address-autocomplete"
          className="w-full py-2.5 px-3 font-light bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition disabled:opacity-70 disabled:cursor-not-allowed rounded-xl outline-none"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const trimmed = query.trim();
              if (!trimmed) return;
              onChange({
                display_name: trimmed,
                latlng: [19.076, 72.8777],
              });
            }
          }}
        />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="text-sm text-destructive">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-sm text-destructive">
        Google Maps failed to load. Check CSP and API key restrictions.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <label htmlFor={inputId} className="sr-only">
          Location search
        </label>
        <input
          id={inputId}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled
          className="w-full py-2.5 px-3 font-light bg-background border border-border rounded-xl outline-none opacity-70 cursor-not-allowed"
          readOnly
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Location search
      </label>

      <StandaloneSearchBox
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onPlacesChanged={handlePlacesChanged}
      >
        <input
          id={inputId}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          className="w-full py-2.5 px-3 font-light bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition disabled:opacity-70 disabled:cursor-not-allowed rounded-xl outline-none"
          onChange={(e) => setQuery(e.target.value)}
        />
      </StandaloneSearchBox>
    </div>
  );
}

