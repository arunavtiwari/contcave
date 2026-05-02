import { Amenities } from '@prisma/client';
import { X } from 'lucide-react';
import React, { useState } from 'react';

import Input from '@/components/inputs/Input';
import Button from '@/components/ui/Button';
import Pill from '@/components/ui/Pill';

export interface AmenitiesData {
  predefined: { [key: number | string]: boolean };
  custom: string[];
}

import FormField from './FormField';

interface AmenitiesCheckboxProps {
  amenities: Amenities[];
  checked?: string[];
  customAmenities?: string[];
  onChange: (updatedAmenities: AmenitiesData) => void;
  label?: string;
  description?: string;
  required?: boolean;
  variant?: "vertical" | "horizontal";
  error?: string;
  id?: string;
}

const AmenitiesCheckbox: React.FC<AmenitiesCheckboxProps> = ({
  amenities,
  checked = [],
  customAmenities = [],
  onChange,
  label,
  description,
  required,
  variant = "vertical",
  error,
  id = "amenities-checkbox",
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
    <FormField
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      variant={variant}
      align='start'
    >
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
          <div className="flex gap-3 items-end">
            <div className="grow">
              <Input
                id="custom-amenity"
                label="Custom amenity"
                placeholder="e.g. Infinity Pool"
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
            <Button
              type="button"
              onClick={handleAddAmenity}
              label="Add"
              fit
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
    </FormField>
  );
};

export default AmenitiesCheckbox;
