'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { IconType } from 'react-icons';

import { Addon } from "@/types/addon";

import { cn } from '@/lib/utils';

import Input from './Input';

type Props = {
  imageUrl?: string;
  icon?: IconType;
  label?: string;
  checked?: boolean;
  hideCheckbox?: boolean;
  hideInputFields?: boolean;
  addon?: Addon;
  onChange: (value: { checked: boolean; price?: number; qty?: number }) => void;
  onClickChange?: () => void;
  className?: string;
};

const ImageCheckbox = ({
  imageUrl,
  icon: Icon,
  label,
  hideCheckbox,
  hideInputFields,
  checked,
  addon,
  onChange,
  onClickChange,
  className
}: Props) => {
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

  const renderVisual = () => {
    if (Icon) {
      return (
        <div
          onClick={onClickChange}
          className={cn(
            "rounded-2xl w-20 h-20 mt-6 mb-2 flex items-center justify-center transition-all duration-300",
            isChecked ? "bg-foreground text-background scale-105 shadow-xl" : "bg-muted text-muted-foreground hover:bg-muted/80",
            hideCheckbox && "cursor-pointer"
          )}
        >
          <Icon size={32} />
        </div>
      );
    }

    if (imageUrl && imageUrl.trim() !== '') {
      return (
        <div className="relative w-20 h-20 mt-6 mb-2 overflow-hidden rounded-2xl group">
          <Image
            src={imageUrl}
            alt={label || "image"}
            fill
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-110",
              isChecked ? "brightness-110" : "brightness-90 hover:brightness-100"
            )}
            onClick={onClickChange}
          />
        </div>
      );
    }

    return (
      <div
        onClick={onClickChange}
        className="rounded-2xl w-20 h-20 mt-6 mb-2 bg-muted/50 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground/40 text-[10px] uppercase tracking-tighter text-center p-2"
      >
        <span className="font-bold">No Preview</span>
      </div>
    );
  };

  return (
    <div className={cn(
      "w-full flex flex-col items-center p-4 rounded-2xl border transition-all duration-300",
      isChecked ? "bg-muted/30 border-foreground/20 shadow-lg" : "bg-transparent border-border hover:border-foreground/10 hover:bg-muted/10",
      className
    )}>
      <label className="w-full cursor-pointer flex flex-col items-center">
        {!hideCheckbox && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="w-5 h-5 accent-foreground bg-muted border-foreground border rounded-full focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
          />
        )}

        {renderVisual()}

        <div className="w-full flex flex-col items-center gap-4">
          <span className={cn(
            "text-sm font-bold truncate transition-colors duration-300",
            isChecked ? "text-foreground" : "text-muted-foreground"
          )}>
            {label}
          </span>

          {!hideInputFields && (
            <div className="w-full space-y-3 mt-2">
              <div className='flex items-center gap-3 w-full justify-between'>
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground shrink-0 leading-none">Price</label>
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
                  placeholder="0"
                  disabled={!isChecked}
                  className="w-24 text-center h-8 text-xs rounded-lg"
                />
              </div>

              <div className='flex items-center gap-3 w-full justify-between'>
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground shrink-0 leading-none">Quantity</label>
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
                  placeholder="0"
                  disabled={!isChecked}
                  className="w-24 text-center h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </label>
    </div>
  );
};

export default ImageCheckbox;
