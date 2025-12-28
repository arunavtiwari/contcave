import React, { useState, useRef } from 'react';
import { useLoadScript, StandaloneSearchBox, Libraries } from '@react-google-maps/api';

const libraries: Libraries = ['places'];

interface AutoCompleteProps {
  value?: string;
  onChange: (value: { display_name: string; latlng: number[] }) => void;
}

interface SearchBox {
  getPlaces(): Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat(): number;
        lng(): number;
      };
    };
  }> | undefined;
}

const AutoComplete = ({ value, onChange }: AutoCompleteProps) => {
  const [query, setQuery] = useState(value || '');
  const searchBoxRef = useRef<SearchBox | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '',
    libraries,
  });

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading...</div>;

  const handlePlacesChanged = () => {
    const places = searchBoxRef.current ? searchBoxRef.current.getPlaces() : [];
    if (places && places.length > 0) {
      const place = places[0];
      if (place.geometry?.location) {
        setQuery(place.formatted_address || '');
        onChange({
          display_name: place.formatted_address || '',
          latlng: [
            place.geometry.location.lat(),
            place.geometry.location.lng(),
          ],
        });
      }
    }
  };

  return (
    <div className="autocomplete-container relative">
      <StandaloneSearchBox
        onLoad={ref => (searchBoxRef.current = ref as unknown as SearchBox)}
        onPlacesChanged={handlePlacesChanged}
      >
        <input
          type="text"
          placeholder="Search for a location"
          value={query}
          className="peer w-full py-2.5 px-3 font-light bg-white border-2 border-gray-300 focus:border-black transition disabled:opacity-70 disabled:cursor-not-allowed rounded-[10px]"
          onChange={e => setQuery(e.target.value)}
        />
      </StandaloneSearchBox>
    </div>
  );
};

export default AutoComplete;
