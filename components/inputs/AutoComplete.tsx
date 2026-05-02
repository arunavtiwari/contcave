'use client';

import { Libraries, useLoadScript } from '@react-google-maps/api';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMapPin } from 'react-icons/fi';

import Select, { SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

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
  label?: string;
  description?: string;
  required?: boolean;
  variant?: "vertical" | "horizontal";
  error?: string;
}

interface PlaceOption extends SelectOption {
  place_id: string;
  main_text: string;
  secondary_text: string;
}

import FormField from './FormField';

export default function AutoComplete({
  value,
  onChange,
  placeholder = 'Search for a location',
  disabled = false,
  className = '',
  label,
  description,
  required,
  variant = "vertical",
  error,
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
    if (!inputValue || inputValue.length < 3 || !autocompleteService.current) {
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
  }, []);

  const handleSelect = useCallback((option: unknown) => {
    const placeOption = option as PlaceOption | null;
    setCurrentValue(placeOption);
    if (!placeOption) return;

    const div = document.createElement('div');
    if (!placesService.current) {
      placesService.current = new google.maps.places.PlacesService(div);
    }

    placesService.current.getDetails(
      { placeId: placeOption.place_id, fields: ['geometry', 'formatted_address', 'name'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const loc = place.geometry.location;
          onChange({
            display_name: place.formatted_address || place.name || placeOption.value,
            latlng: [loc.lat(), loc.lng()],
          });
        }
      }
    );
  }, [onChange]);

  if (!apiKey) return <div className="text-sm text-destructive">Missing NEXT_PUBLIC_GOOGLE_MAPS_API.</div>;
  if (loadError) return <div className="text-sm text-destructive">Google Maps failed to load.</div>;

  return (
    <FormField
      id="autocomplete-input"
      label={label}
      description={description}
      required={required}
      error={error}
      variant={variant}
    >
      <div className={cn("w-full", className)}>
        <Select<PlaceOption>
          isAsync
          cacheOptions
          defaultOptions
          loadOptions={loadOptions}
          value={currentValue}
          onChange={handleSelect}
          placeholder={placeholder}
          isDisabled={disabled || !isLoaded}
          error={error}
          isSearchable={true}
          components={{
            DropdownIndicator: () => null,
            IndicatorSeparator: () => null,
            Option: (props) => {
              const { innerProps, isFocused, isSelected, data } = props;
              return (
                <div
                  {...innerProps}
                  className={cn(
                    "px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors",
                    isFocused ? "bg-muted" : "transparent",
                    isSelected && "bg-foreground text-background"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center transition-colors",
                    isFocused && "bg-foreground text-background"
                  )}>
                    <FiMapPin size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {data.main_text}
                    </div>
                    <div className={cn(
                      "text-sm truncate italic",
                      isSelected ? "text-background/70" : "text-muted-foreground"
                    )}>
                      {data.secondary_text}
                    </div>
                  </div>
                </div>
              );
            }
          }}
          noOptionsMessage={({ inputValue }) =>
            inputValue.length >= 3 ? "No locations found" : "Type at least 3 characters to search"
          }
          loadingMessage={() => "Searching locations..."}
        />
      </div>
    </FormField>
  );
}
