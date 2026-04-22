'use client';

import { Libraries, StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import Input from '@/components/inputs/Input';

const LIBRARIES: Libraries = ['places'];

type LatLngTuple = [number, number];

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
        <Input
          id={inputId}
          value={query}
          placeholder={placeholder}
          disabled
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <StandaloneSearchBox
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onPlacesChanged={handlePlacesChanged}
      >
        <Input
          id={inputId}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
        />
      </StandaloneSearchBox>
    </div>
  );
}

