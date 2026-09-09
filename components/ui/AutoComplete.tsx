'use client';

import { Libraries, useLoadScript } from '@react-google-maps/api';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiMapPin } from 'react-icons/fi';
import { components, type OptionProps } from "react-select";

import Select, { SelectOption } from '@/components/ui/Select';

const LIBRARIES: Libraries = ['places'];

type LatLngTuple = [number, number];

export interface AutoCompleteValue {
  display_name: string;
  latlng: LatLngTuple;
}

export interface AutoCompleteProps {
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
  size?: "xs" | "sm" | "md" | "lg";
}

export interface PlaceOption extends SelectOption {
  place_id: string;
  main_text: string;
  secondary_text: string;
}

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
  size = "sm",
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
      cacheOptions
      defaultOptions
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
          return (
            <components.Option {...props}>
              <div className="flex items-center justify-between w-full gap-3 py-0.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FiMapPin size={13} className="stroke-[2.25]" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="truncate text-sm font-medium text-foreground">
                      {data.main_text}
                    </span>
                    {data.secondary_text && (
                      <span className="truncate text-xs text-muted-foreground font-normal mt-0.5">
                        {data.secondary_text}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <FiCheck
                    size={14}
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
              {props.selectProps.inputValue?.length >= 3
                ? "No locations found"
                : "Type at least 3 characters to search"}
            </span>
          </components.NoOptionsMessage>
        ),
        LoadingMessage: (props) => (
          <components.LoadingMessage {...props}>
            <span className="text-xs text-muted-foreground py-2 block">
              Searching locations...
            </span>
          </components.LoadingMessage>
        ),
      }}
    />
  );
}
