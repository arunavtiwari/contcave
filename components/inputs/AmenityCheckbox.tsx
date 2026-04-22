import { Amenities } from '@prisma/client';
import { X } from 'lucide-react';
import React, { useState } from 'react';

import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Input from './Input';

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
      <div className="flex flex-wrap gap-2">
        {amenities.map(({ id, name }) => {
          const isSelected = !!checkedItems[id];
          return (
            <Pill
              key={id}
              label={name}
              variant={isSelected ? "solid" : "secondary"}
              onClick={() => handleCheckboxChange(id)}
              className="cursor-pointer transition-all hover:opacity-80"
            />
          );
        })}
      </div>


      <div className="mt-8">
        <label htmlFor="custom-amenity" className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
          Custom Amenity
        </label>
        <div className="flex gap-3 items-start">
          <div className="grow">
            <Input
              id="custom-amenity"
              placeholder="e.g. Infinity Pool"
              value={otherAmenity}
              onChange={(e) => setOtherAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity();
                }
              }}
              size='sm'
            />
          </div>
          <Button
            type="button"
            onClick={handleAddAmenity}
            label="ADD"
            fit
            size='sm'
          />
        </div>
      </div>

      {amenitiesList.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {amenitiesList.map((amenity) => (
            <Pill
              key={amenity}
              label={amenity}
              variant="solid"
              size="sm"
              onClick={() => handleRemoveAmenity(amenity)}
              icon={X}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AmenitiesCheckbox;
