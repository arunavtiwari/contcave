import React, { useState } from 'react';
import Checkbox from './Checkbox';
import { Amenities } from '@prisma/client';

interface AmenitiesCheckboxProps {
  amenities: Amenities[];
  onChange: (updatedAmenities: { [key: number | string]: boolean }) => void;
}

const AmenitiesCheckbox: React.FC<AmenitiesCheckboxProps> = ({ amenities, onChange }) => {
  const [checkedItems, setCheckedItems] = useState<{ [key: number | string]: boolean }>({});
  const [otherAmenity, setOtherAmenity] = useState('');
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);

  const handleChange = (id: number | string) => {
    setCheckedItems((prevCheckedItems) => ({
      ...prevCheckedItems,
      [id]: !prevCheckedItems[id],
    }));
  };

  const handleCheckboxChange = (id: number | string) => {
    handleChange(id);
    onChange({ ...checkedItems, [id]: !checkedItems[id] });
  };

  const handleAddAmenity = () => {
    if (otherAmenity && !amenitiesList.includes(otherAmenity)) {
      setAmenitiesList([...amenitiesList, otherAmenity]);
      setOtherAmenity('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setAmenitiesList(amenitiesList.filter((item) => item !== amenity));
  };

  return (
    <div>
      <div className='grid grid-cols-3 gap-4 mb-4'>
        {amenities.map(({ id, name }) => (
          <Checkbox
            key={id}
            label={name}
            isChecked={checkedItems[id] || false}
            onChange={() => handleCheckboxChange(id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={otherAmenity}
          onChange={(e) => setOtherAmenity(e.target.value)}
          placeholder="Other amenity"
          className="border-b-2 border-gray-300 rounded px-4 py-2 w-full"
        />
        <button
          onClick={handleAddAmenity}
          className="bg-rose-500 text-white px-4 py-2 rounded-lg"
        >
          ADD
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {amenitiesList.map((amenity) => (
          <span key={amenity} className="flex items-center gap-2 bg-rose-500 text-white text-xs px-4 py-1 rounded-full">
            {amenity}
            <button onClick={() => handleRemoveAmenity(amenity)} className="text-lg">&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default AmenitiesCheckbox;
