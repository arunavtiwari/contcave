import React, { useState, useEffect } from 'react';

type Props = {
  imageUrl: string;
  label?: string;
  checked?: boolean;
  hideCheckbox?: boolean;
  hideInputFields?: boolean;
  addon?: any;
  onChange: (value: { checked: boolean; price?: any; qty?: any }) => void;
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
      onChange({ checked: true, price: newPrice !== '' ? newPrice : undefined, qty: qty });

    }
  };
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQty = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setQty(newQty);
    if (isChecked) {
      setIsChecked(isChecked);
      onChange({ checked: true, price: price, qty: newQty !== '' ? newQty : undefined });
    }
  };
  return (
    <>

      <label className="w-full cursor-pointer flex flex-col items-center" data-tooltip-target="tooltip-default">
        {!hideCheckbox && (<input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="w-6 h-6 text-black bg-gray-100 border-black border-2 rounded-full focus:ring-transparent"
        />)}
        {hideCheckbox && <img src={imageUrl} alt={label} className="rounded-md w-20 mt-6 mb-2"
          onClick={onClickChange}
        />}
        {!hideCheckbox && <img src={imageUrl} alt={label} className="rounded-md mt-2" style={{ width: addon.width ? addon.width + "px" : "97px" }} />}


        <div className="w-full flex flex-col items-center gap-3">
          <span className="addon-name truncate mt-2">{label}</span>
          {/* Price */}
          {!hideInputFields && (
            <div className='flex items-center gap-4 w-full justify-between'>
              <label className="text-sm">Price</label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-gray-500 border-r pr-2">₹</span>
                <input
                  type="number"
                  value={addon.price ? addon.price : price}
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
            <div className='flex items-center gap-4 w-full justify-between'>
              <label className="text-sm">Quantity</label>
              <input
                type="number"
                value={addon.qty ? addon.qty : qty}
                onChange={handleQtyChange}
                className="w-[150px] text-center border rounded-xl py-1 pl-7"
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
