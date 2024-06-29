import React, { useState, useEffect, useRef } from 'react';
import { useLoadScript, StandaloneSearchBox, Libraries } from '@react-google-maps/api';

const libraries:Libraries = ['places'];

const AutoComplete = ({ value, onChange }: any) => {
  const [query, setQuery] = useState(value || '');
  const [isActive, setIsActive] = useState(false); // To control the display of suggestions
  const searchBoxRef:any = useRef();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyBEruwwnOyCLP9Al1y8a2a2Q6pRu50es0g', 
    libraries,
  });

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading...</div>;

  const handlePlacesChanged = () => {
    const places = searchBoxRef.current ? searchBoxRef.current.getPlaces() : [];
    if (places && places.length > 0) {
      const place = places[0];
      setQuery(place.formatted_address);
      onChange({
        display_name: place.formatted_address,
        latlng: {
          lat: place.geometry.location.lat(),
          lon: place.geometry.location.lng(),
        },
      });
      setIsActive(false);
    }
  };

  return (
    <div className="autocomplete-container relative">
      <StandaloneSearchBox
        onLoad={ref => (searchBoxRef.current = ref)}
        onPlacesChanged={handlePlacesChanged}
      >
        <input
          type="text"
          placeholder="Search for a location"
          value={query}
          className="peer w-full p-4 pt-6 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsActive(true)} // Show suggestions when the input is focused
        />
      </StandaloneSearchBox>
    </div>
  );
};

export default AutoComplete;
