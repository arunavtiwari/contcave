import Image from 'next/image';
import React, { useEffect, useState } from 'react';

import { Addon } from "@/types/addon";

import Input from './Input';

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
  const [price, setPrice] = useState<number | ''>(addon?.price && addon.price > 0 ? addon.price : '');
  const [qty, setQty] = useState<number | ''>(addon?.qty && addon.qty > 0 ? addon.qty : '');

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  useEffect(() => {
    if (addon?.price && addon.price > 0) setPrice(addon.price);
    if (addon?.qty && addon.qty > 0) setQty(addon.qty);
  }, [addon?.price, addon?.qty]);

  const handleCheckboxChange = () => {
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    onChange({ checked: newCheckedState, price: price !== '' ? price : undefined, qty: qty !== '' ? qty : undefined });
  };
  return (
    <>

      <label className="w-full cursor-pointer flex flex-col items-center" data-tooltip-target="tooltip-default">
        {!hideCheckbox && (<input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="w-6 h-6 accent-foreground bg-muted border-foreground border rounded-full focus:ring-transparent checked:bg-foreground checked:border-foreground"
        />)}
        {hideCheckbox && (
          (imageUrl && imageUrl.trim() !== '') ? (
            <Image
              src={imageUrl}
              alt={label || "image"}
              width={80}
              height={80}
              className="rounded-xl w-20 h-20 mt-6 mb-2 object-cover"
              onClick={onClickChange}
            />
          ) : (
            <div
              className="rounded-xl w-20 h-20 mt-6 mb-2 bg-muted flex items-center justify-center text-muted-foreground/50 text-xs text-center p-1"
              onClick={onClickChange}
            >
              No Image
            </div>
          )
        )}
        {!hideCheckbox && (
          (imageUrl && imageUrl.trim() !== '') ? (
            <Image
              src={imageUrl}
              alt={label || "image"}
              width={97}
              height={97}
              className="rounded-xl mt-2 object-cover w-24.25 h-24.25"
            />
          ) : (
            <div className="rounded-xl mt-2 w-24.25 h-24.25 bg-muted flex items-center justify-center text-muted-foreground/50 text-xs text-center p-1">
              No Image
            </div>
          )
        )}


        <div className="w-full flex flex-col items-center gap-3">
          <span className="addon-name truncate mt-2">{label}</span>

          {!hideInputFields && (
            <div className='flex items-center gap-2 w-full justify-between'>
              <label className="text-sm font-semibold shrink-0">Price</label>
              <Input
                id={`addon-price-${label}`}
                value={price}
                type="number"
                onNumberChange={(val) => {
                  setPrice(val);
                  if (isChecked) {
                    onChange({ checked: true, price: val, qty: qty !== '' ? qty : undefined });
                  }
                }}
                placeholder="Price"
                disabled={!isChecked}
                className="w-37.5 text-center"
              />
            </div>
          )}


          {!hideInputFields && (
            <div className='flex items-center gap-2 w-full justify-between'>
              <label className="text-sm font-semibold shrink-0">Quantity</label>
              <Input
                id={`addon-qty-${label}`}
                value={qty}
                type="number"
                onNumberChange={(val) => {
                  setQty(val);
                  if (isChecked) {
                    onChange({ checked: true, price: price !== '' ? price : undefined, qty: val });
                  }
                }}
                placeholder="Quantity"
                disabled={!isChecked}
                className="w-37.5 text-center"
              />
            </div>
          )}
        </div>
      </label>
    </>
  );
};

export default ImageCheckbox;


