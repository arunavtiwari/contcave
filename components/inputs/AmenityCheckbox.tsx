import { Amenities } from '@prisma/client';
import React, { useState } from 'react';

import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';

export interface AmenitiesData {
  predefined: { [key: number | string]: boolean };
  custom: string[];
}

interface AmenitiesCheckboxProps {
  amenities: Amenities[];
  checked?: string[];
  customAmenities?: string[];
  onChange: (updatedAmenities: AmenitiesData) => void;
}

const AmenitiesCheckbox: React.FC<AmenitiesCheckboxProps> = ({
  amenities,
  checked = [],
  customAmenities = [],
  onChange,
}) => {
  const [otherAmenity, setOtherAmenity] = useState('');
  const checkedItems = checked.reduce<{ [key: number | string]: boolean }>((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});
  const amenitiesList = Array.isArray(customAmenities) ? customAmenities : [];

  const triggerOnChange = (
    updatedPredefined: { [key: number | string]: boolean },
    updatedCustom: string[]
  ) => {
    onChange({
      predefined: updatedPredefined,
      custom: updatedCustom,
    });
  };

  const handleCheckboxChange = (id: number | string) => {
    const updatedState = { ...checkedItems, [id]: !checkedItems[id] };
    triggerOnChange(updatedState, amenitiesList);
  };

  const handleAddAmenity = () => {
    const normalizedAmenity = otherAmenity.trim();
    const amenityExists = amenitiesList.some(
      (item) => item.toLowerCase() === normalizedAmenity.toLowerCase()
    );

    if (normalizedAmenity && !amenityExists) {
      const newAmenitiesList = [...amenitiesList, normalizedAmenity];
      triggerOnChange(checkedItems, newAmenitiesList);
      setOtherAmenity('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    const newAmenitiesList = amenitiesList.filter((item) => item !== amenity);
    triggerOnChange(checkedItems, newAmenitiesList);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {amenities.map(({ id, name }) => (
          <Checkbox
            key={id}
            label={name}
            checked={!!checkedItems[id]}
            onChange={() => handleCheckboxChange(id)}
          />
        ))}
      </div>

      <div className="mt-8">
        <label htmlFor="custom-amenity" className="block text-sm font-medium text-gray-700 mb-1">
          Custom Amenity
        </label>
        <div className="flex gap-2 items-start">
          <div className="grow">
            <Input
              id="custom-amenity"
              placeholder="Enter custom amenity"
              value={otherAmenity}
              onChange={(e) => setOtherAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddAmenity}
            className="bg-black hover:opacity-90 text-white px-8 h-11 rounded-xl flex items-center justify-center font-medium transition"
          >
            ADD
          </button>
        </div>
      </div>

      {amenitiesList.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {amenitiesList.map((amenity) => (
            <span
              key={amenity}
              className="flex items-center gap-2 bg-black text-white text-xs px-4 py-1 rounded-full"
            >
              {amenity}
              <button type="button" onClick={() => handleRemoveAmenity(amenity)} className="text-lg">
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AmenitiesCheckbox;
