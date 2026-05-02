'use client';

import { AnimatePresence,motion } from 'framer-motion';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { IconType } from 'react-icons';
import { FiCheck } from 'react-icons/fi';

import { cn } from '@/lib/utils';
import { Addon } from "@/types/addon";

import Checkbox from './Checkbox';
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
    onChange({
      checked: newCheckedState,
      price: price !== '' ? price : undefined,
      qty: qty !== '' ? qty : undefined
    });
  };

  const renderVisual = () => {
    if (Icon) {
      return (
        <div
          className={cn(
            "rounded-xl w-14 h-14 flex items-center justify-center transition-colors duration-500 shrink-0",
            isChecked
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
          )}
        >
          <Icon size={24} />
        </div>
      );
    }

    if (imageUrl && imageUrl.trim() !== '') {
      return (
        <div className="relative w-14 h-14 overflow-hidden rounded-xl bg-muted/30 shrink-0 border border-border/40">
          <Image
            src={imageUrl}
            alt={label || "image"}
            fill
            className={cn(
              "object-contain p-2 transition-transform duration-700",
              isChecked ? "scale-110" : "group-hover:scale-110"
            )}
          />
        </div>
      );
    }

    return (
      <div
        className="rounded-xl w-14 h-14 bg-muted/20 border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/20 text-[8px] font-black shrink-0"
      >
        <span>N/A</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isChecked ? 'rgba(0, 0, 0, 0.02)' : 'var(--color-background)',
      }}
      className={cn(
        "group relative w-full flex flex-col p-4 rounded-2xl border transition-all duration-500",
        isChecked
          ? "border-foreground/20"
          : "bg-background border-border hover:border-foreground/10 hover:bg-muted/5",
        className
      )}
    >
      <div
        onClick={onClickChange || handleCheckboxChange}
        className="flex items-center gap-4 cursor-pointer"
      >
        {renderVisual()}

        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-medium tracking-tight transition-colors duration-500 truncate",
            isChecked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {label}
          </h4>
          {isChecked && (
            <p className="text-sm text-foreground/40 font-medium mt-0.5">
              Active selection
            </p>
          )}
        </div>

        {/* Selection Control */}
        {!hideCheckbox && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isChecked}
              onCheckedChange={onClickChange || handleCheckboxChange}
            />
          </div>
        )}
      </div>

      {/* Input Fields Area (Expandable) */}
      {!hideInputFields && (
        <AnimatePresence>
          {isChecked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-muted/5 grid grid-cols-2 gap-4">
                <div className='w-full'>
                  <Input
                    id={`addon-price-${label}`}
                    label="Price"
                    value={price}
                    type="number"
                    onNumberChange={(val) => {
                      setPrice(val);
                      onChange({ checked: true, price: val, qty: qty !== '' ? qty : undefined });
                    }}
                    placeholder="0"
                  />
                </div>

                <div className='w-full'>
                  <Input
                    id={`addon-qty-${label}`}
                    label="Quantity"
                    value={qty}
                    type="number"
                    onNumberChange={(val) => {
                      setQty(val);
                      onChange({ checked: true, price: price !== '' ? price : undefined, qty: val });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default ImageCheckbox;
