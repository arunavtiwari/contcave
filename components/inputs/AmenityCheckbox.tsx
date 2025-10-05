import React, { useState, useEffect } from 'react';
import Checkbox from './Checkbox';
import { Amenities } from '@prisma/client';

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
  const [checkedItems, setCheckedItems] = useState<{ [key: number | string]: boolean }>(() => {
    const initialState: { [key: number | string]: boolean } = {};
    checked.forEach((id) => {
      initialState[id] = true;
    });
    return initialState;
  });

  const [otherAmenity, setOtherAmenity] = useState('');
  const [amenitiesList, setAmenitiesList] = useState<string[]>(customAmenities);

  useEffect(() => {
    if (customAmenities.join() !== amenitiesList.join()) {
      const timer = setTimeout(() => {
        setAmenitiesList(customAmenities);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [customAmenities, amenitiesList]);

  const triggerOnChange = (
    updatedPredefined: { [key: number | string]: boolean },
    updatedCustom: string[]
  ) => {
    setTimeout(() => {
      onChange({
        predefined: updatedPredefined,
        custom: updatedCustom,
      });
    }, 0);
  };

  const handleCheckboxChange = (id: number | string) => {
    setCheckedItems((prevState) => {
      const updatedState = { ...prevState, [id]: !prevState[id] };
      triggerOnChange(updatedState, amenitiesList);
      return updatedState;
    });
  };

  const handleAddAmenity = () => {
    if (otherAmenity && !amenitiesList.includes(otherAmenity)) {
      const newAmenitiesList = [...amenitiesList, otherAmenity];
      setAmenitiesList(newAmenitiesList);
      triggerOnChange(checkedItems, newAmenitiesList);
      setOtherAmenity('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    const newAmenitiesList = amenitiesList.filter((item) => item !== amenity);
    setAmenitiesList(newAmenitiesList);
    triggerOnChange(checkedItems, newAmenitiesList);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {amenities.map(({ id, name }) => (
          <Checkbox
            key={id}
            label={name}
            isChecked={!!checkedItems[id]}
            onChange={() => handleCheckboxChange(id)}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-8">
        <input
          type="text"
          value={otherAmenity}
          onChange={(e) => setOtherAmenity(e.target.value)}
          placeholder="Other amenity"
          className="border-b-2 border-gray-300 rounded-2xl px-4 py-2 w-full"
        />
        <button onClick={handleAddAmenity} className="bg-black hover:opacity-90 text-white px-8 py-2 rounded-2xl">
          ADD
        </button>
      </div>

      {amenitiesList.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {amenitiesList.map((amenity) => (
            <span
              key={amenity}
              className="flex items-center gap-2 bg-black text-white text-xs px-4 py-1 rounded-full"
            >
              {amenity}
              <button onClick={() => handleRemoveAmenity(amenity)} className="text-lg">
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
