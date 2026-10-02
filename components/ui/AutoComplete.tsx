'use client';

import { Libraries, useLoadScript } from '@react-google-maps/api';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { LuLocateFixed, LuMapPin } from 'react-icons/lu';
import { components, type OptionProps } from "react-select";

import Select, { SelectOption } from '@/components/ui/Select';
import { getVisitorLocationAction } from '@/app/actions/studioFeedActions';
import { distanceKm } from '@/lib/geo';

const LIBRARIES: Libraries = ['places'];

type LatLngTuple = [number, number];

export interface AutoCompleteValue {
  display_name: string;
  name: string;
  latlng: LatLngTuple;
  radiusKm: number | null;
}

export interface PlaceOption extends SelectOption {
  place_id: string;
  main_text: string;
  secondary_text: string;
  isNearby?: boolean;
  latlng?: LatLngTuple;
  radiusKm?: number | null;
}

export interface AutoCompleteProps {
  value?: string;
  onChange: (value: AutoCompleteValue) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  required?: boolean;
  variant?: "vertical" | "horizontal";
  error?: string;
  size?: "xs" | "sm" | "md" | "lg";
  enableNearby?: boolean;
  enableSuggestions?: boolean;
}

const POPULAR_HUBS: PlaceOption[] = [
  {
    value: "Delhi NCR, India",
    label: "Delhi NCR, India",
    place_id: "__HUB_DELHI__",
    main_text: "Delhi NCR",
    secondary_text: "Delhi, Gurgaon, Noida & Faridabad",
    latlng: [28.6139, 77.2090],
    radiusKm: 40,
  },
  {
    value: "Noida, Uttar Pradesh",
    label: "Noida, Uttar Pradesh",
    place_id: "__HUB_NOIDA__",
    main_text: "Noida",
    secondary_text: "Uttar Pradesh",
    latlng: [28.5355, 77.3910],
    radiusKm: 25,
  },
  {
    value: "Gurugram, Haryana",
    label: "Gurugram, Haryana",
    place_id: "__HUB_GURUGRAM__",
    main_text: "Gurugram",
    secondary_text: "Haryana",
    latlng: [28.4595, 77.0266],
    radiusKm: 25,
  },
  {
    value: "Chandigarh, India",
    label: "Chandigarh, India",
    place_id: "__HUB_CHANDIGARH__",
    main_text: "Chandigarh & Mohali",
    secondary_text: "Punjab & Haryana",
    latlng: [30.7333, 76.7794],
    radiusKm: 30,
  },
  {
    value: "Mumbai, Maharashtra",
    label: "Mumbai, Maharashtra",
    place_id: "__HUB_MUMBAI__",
    main_text: "Mumbai",
    secondary_text: "Maharashtra",
    latlng: [19.0760, 72.8777],
    radiusKm: 35,
  },
  {
    value: "Bengaluru, Karnataka",
    label: "Bengaluru, Karnataka",
    place_id: "__HUB_BENGALURU__",
    main_text: "Bengaluru",
    secondary_text: "Karnataka",
    latlng: [12.9716, 77.5946],
    radiusKm: 35,
  },
];

const NEARBY_OPTION: PlaceOption = {
  value: "__NEARBY__",
  label: "Nearby",
  place_id: "__NEARBY__",
  main_text: "Nearby",
  secondary_text: "Use your current location",
  isNearby: true,
};

export default function AutoComplete({
  value,
  onChange,
  onClear,
  placeholder = 'Search for a location',
  disabled = false,
  className = '',
  label,
  description,
  required,
  variant = "vertical",
  error,
  size = "sm",
  enableNearby = false,
  enableSuggestions = false,
}: AutoCompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '';
  const [currentValue, setCurrentValue] = useState<PlaceOption | null>(null);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const libraries = useMemo(() => LIBRARIES, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Build default suggestions list (Nearby + Popular Hubs)
  const defaultOptions = useMemo<PlaceOption[]>(() => {
    const list: PlaceOption[] = [];
    if (enableNearby) {
      list.push(NEARBY_OPTION);
    }
    if (enableSuggestions) {
      list.push(...POPULAR_HUBS);
    }
    return list;
  }, [enableNearby, enableSuggestions]);

  // Handle external value changes (initial load or reset)
  useEffect(() => {
    if (value && (!currentValue || currentValue.value !== value)) {
      setCurrentValue({
        value: value,
        label: value,
        place_id: '',
        main_text: value,
        secondary_text: ''
      });
    } else if (!value) {
      setCurrentValue(null);
    }
  }, [value, currentValue]);

  const loadOptions = useCallback((inputValue: string, callback: (options: PlaceOption[]) => void) => {
    if (!inputValue || inputValue.length < 3) {
      callback(defaultOptions);
      return;
    }

    if (!autocompleteService.current) {
      callback([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: inputValue,
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' }
      },
      (results) => {
        const options: PlaceOption[] = (results || []).map(r => ({
          value: r.description,
          label: r.description,
          place_id: r.place_id,
          main_text: r.structured_formatting.main_text,
          secondary_text: r.structured_formatting.secondary_text
        }));
        callback(options);
      }
    );
  }, [defaultOptions]);

  const handleSelect = useCallback((option: unknown) => {
    const placeOption = option as PlaceOption | null;
    if (!placeOption) {
      setCurrentValue(null);
      onClear?.();
      return;
    }

    // 1. Handle "Nearby" / GPS Location Option with Guaranteed Selection
    if (placeOption.isNearby || placeOption.place_id === '__NEARBY__') {
      const fallbackToIpLocation = async () => {
        let latlng: LatLngTuple = [28.6139, 77.2090];
        try {
          const res = await getVisitorLocationAction({});
          if (res.success && res.data?.latlng) {
            latlng = res.data.latlng;
          }
        } catch {
          // fallback to default coords
        }

        const resolvedOption: PlaceOption = {
          value: "Nearby",
          label: "Nearby",
          place_id: '__CURRENT_LOCATION__',
          main_text: "Nearby",
          secondary_text: "Current area",
          latlng,
          radiusKm: null,
        };

        setCurrentValue(resolvedOption);
        onChange({
          display_name: "Nearby",
          name: "Nearby",
          latlng,
          radiusKm: null,
        });
      };

      if (typeof window === "undefined" || !navigator.geolocation) {
        void fallbackToIpLocation();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const latlng: LatLngTuple = [lat, lng];

          let displayName = "Nearby";
          let localityName = "Nearby";

          // Reverse geocode to find exact city/locality if available
          try {
            if (window.google?.maps?.Geocoder) {
              const geocoder = new google.maps.Geocoder();
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results && response.results[0]) {
                const best = response.results[0];
                const locality = best.address_components.find((c) =>
                  c.types.includes("sublocality") || c.types.includes("locality") || c.types.includes("administrative_area_level_2")
                );
                if (locality) {
                  localityName = locality.long_name;
                  displayName = locality.long_name;
                } else {
                  displayName = best.formatted_address;
                }
              }
            }
          } catch {
            // fallback to "Nearby"
          }

          const resolvedOption: PlaceOption = {
            value: displayName,
            label: displayName,
            place_id: '__CURRENT_LOCATION__',
            main_text: displayName,
            secondary_text: 'Current location',
            latlng,
            radiusKm: null,
          };

          setCurrentValue(resolvedOption);
          onChange({
            display_name: displayName,
            name: localityName,
            latlng,
            radiusKm: null,
          });
        },
        async () => {
          // If browser GPS is denied, blocked, or timed out, fall back seamlessly to network IP location
          await fallbackToIpLocation();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
      return;
    }

    // 2. Handle Preset Popular Hubs
    if (placeOption.latlng) {
      setCurrentValue(placeOption);
      onChange({
        display_name: placeOption.value,
        name: placeOption.main_text,
        latlng: placeOption.latlng,
        radiusKm: placeOption.radiusKm ?? 25,
      });
      return;
    }

    // 3. Handle Google Places Predictions
    setCurrentValue(placeOption);
    const div = document.createElement('div');
    if (!placesService.current) {
      placesService.current = new google.maps.places.PlacesService(div);
    }

    placesService.current.getDetails(
      { placeId: placeOption.place_id, fields: ['geometry', 'formatted_address', 'name'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const loc = place.geometry.location;
          const center: LatLngTuple = [loc.lat(), loc.lng()];
          const corner = place.geometry.viewport?.getNorthEast();
          onChange({
            display_name: place.formatted_address || place.name || placeOption.value,
            name: place.name || placeOption.main_text,
            latlng: center,
            radiusKm: corner ? distanceKm(center, [corner.lat(), corner.lng()]) : null,
          });
        }
      }
    );
  }, [onChange, onClear]);

  if (!apiKey) return <div className="text-sm text-destructive">Missing NEXT_PUBLIC_GOOGLE_MAPS_API.</div>;
  if (loadError) return <div className="text-sm text-destructive">Google Maps failed to load.</div>;

  return (
    <Select<PlaceOption>
      id="autocomplete-input"
      label={label}
      description={description}
      required={required}
      error={error}
      variant={variant}
      size={size}
      className={className}
      isAsync
      isClearable={Boolean(onClear)}
      cacheOptions
      defaultOptions={defaultOptions.length > 0 ? defaultOptions : true}
      loadOptions={loadOptions}
      value={currentValue}
      onChange={handleSelect}
      placeholder={placeholder}
      isDisabled={disabled || !isLoaded}
      isSearchable={true}
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        Option: (props: OptionProps<PlaceOption, false>) => {
          const { data, isSelected } = props;
          const isNearby = data.isNearby || data.place_id === '__NEARBY__';

          return (
            <components.Option {...props}>
              <div className="flex items-center justify-between w-full gap-3 py-1">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isNearby
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isNearby ? (
                      <LuLocateFixed size={15} className="stroke-[2.25]" />
                    ) : (
                      <LuMapPin size={15} className="stroke-[2.25]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left justify-center">
                    <span className={`truncate text-sm leading-snug ${isNearby ? "text-foreground font-semibold" : "font-medium text-foreground"}`}>
                      {data.main_text}
                    </span>
                    {data.secondary_text && (
                      <span className="truncate text-xs text-muted-foreground font-normal leading-snug">
                        {data.secondary_text}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <FiCheck
                    size={15}
                    className="text-foreground shrink-0 ml-auto"
                  />
                )}
              </div>
            </components.Option>
          );
        },
        NoOptionsMessage: (props) => (
          <components.NoOptionsMessage {...props}>
            <span className="text-xs text-muted-foreground py-2 block">
              {props.selectProps.inputValue && props.selectProps.inputValue.length >= 3
                ? "No locations found"
                : "Type at least 3 characters to search"}
            </span>
          </components.NoOptionsMessage>
        ),
      }}
    />
  );
}

