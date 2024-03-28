import React, { useState, useEffect } from 'react';

type Props = {
  imageUrl: string;
  label: string;
  checked: boolean;
  onChange: (value: { checked: boolean; price?: number }) => void;
};

const ImageCheckbox = ({ imageUrl, label, checked, onChange }: Props) => {
  const [isChecked, setIsChecked] = useState(checked);
  const [price, setPrice] = useState<number | ''>('');

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleCheckboxChange = () => {
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    onChange({ checked: newCheckedState, price: price !== '' ? price : undefined });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setPrice(newPrice);
    // Call onChange only if the checkbox is checked
    if (isChecked) {
      setIsChecked(isChecked);
      console.log(newPrice);
      onChange({ checked: true, price: newPrice !== '' ? newPrice : undefined });
    }
  };

  return (
    <>

    <label className="image-checkbox block cursor-pointer"  data-tooltip-target="tooltip-default">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleCheckboxChange}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-md focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <img src={imageUrl} alt={label} className="rounded-md" />
      <div className="flex justify-between items-center">
        <span className="addon-name text-ellipsis truncate">{label}</span>
        <input
          type="text" // Change to number to ensure only numerical input
          value={price}
          onChange={handlePriceChange}
          className="w-20 text-center border rounded-md px-2 py-1"
          placeholder="₹ Price"
          disabled={!isChecked} // Disable if not checked
        />
      </div>
    </label>
    </>
  );
};

export default ImageCheckbox;
