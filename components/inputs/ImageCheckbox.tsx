import Image from 'next/image';
import React, { useEffect,useState } from 'react';

import { Addon } from "@/types/addon";

type Props = {
  imageUrl: string;
  label?: string;
  checked?: boolean;
  hideCheckbox?: boolean;
  hideInputFields?: boolean;
  addon?: Addon;
  onChange: (value: { checked: boolean; price?: number; qty?: number }) => void;
  onClickChange?: () => void;

};

const ImageCheckbox = ({ imageUrl, label, hideCheckbox, hideInputFields, checked, addon, onChange, onClickChange }: Props) => {
  const [isChecked, setIsChecked] = useState(checked);
  const [price, setPrice] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>('');

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
      onChange({ checked: true, price: newPrice !== '' ? newPrice : undefined, qty: qty !== '' ? qty : undefined });

    }
  };
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQty = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setQty(newQty);
    if (isChecked) {
      setIsChecked(isChecked);
      onChange({ checked: true, price: price !== '' ? price : undefined, qty: newQty !== '' ? newQty : undefined });
    }
  };
  return (
    <>

      <label className="w-full cursor-pointer flex flex-col items-center" data-tooltip-target="tooltip-default">
        {!hideCheckbox && (<input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="w-6 h-6 accent-black bg-gray-100 border-black border-2 rounded-full focus:ring-transparent checked:bg-black checked:border-black"
        />)}
        {hideCheckbox && (
          <Image
            src={imageUrl}
            alt={label || "image"}
            width={80}
            height={80}
            className="rounded-md w-20 h-20 mt-6 mb-2 object-cover"
            onClick={onClickChange}
          />
        )}
        {!hideCheckbox && (
          <Image
            src={imageUrl}
            alt={label || "image"}
            width={97}
            height={97}
            className="rounded-md mt-2 object-cover w-[97px] h-[97px]"
          />
        )}


        <div className="w-full flex flex-col items-center gap-3">
          <span className="addon-name truncate mt-2">{label}</span>
          {/* Price */}
          {!hideInputFields && (
            <div className='flex items-center gap-2 w-full justify-between'>
              <label className="text-sm font-semibold shrink-0">Price</label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-gray-500 border-r pr-2">₹</span>
                <input
                  type="number"
                  value={addon?.price ? addon.price : price}
                  onChange={handlePriceChange}
                  className="w-[150px] text-center border rounded-xl py-1 pl-10"
                  placeholder="Price"
                  disabled={!isChecked}
                />
              </div>
            </div>
          )}

          {/* Quantity */}
          {!hideInputFields && (
            <div className='flex items-center gap-2 w-full justify-between'>
              <label className="text-sm font-semibold shrink-0">Quantity</label>
              <input
                type="number"
                value={addon?.qty ? addon.qty : qty}
                onChange={handleQtyChange}
                className="w-[150px] text-center border rounded-xl py-1 px-3"
                placeholder="Quantity"
                disabled={!isChecked}
              />
            </div>
          )}
        </div>
      </label>
    </>
  );
};

export default ImageCheckbox;
