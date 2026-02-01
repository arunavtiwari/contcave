"use client";

import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai"; // spinner icon

type Props = {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  rounded?: boolean;
  icon?: IconType;
  isColor?: boolean;
  classNames?: string;
};

function Button({
  label,
  onClick,
  disabled,
  loading,
  outline,
  rounded,
  icon: Icon,
  isColor,
  classNames,
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative 
        cursor-pointer
        disabled:opacity-70 
        disabled:cursor-not-allowed 
        hover:opacity-90 
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-black
        focus-visible:ring-offset-2
        py-[10px]
        transition 
        w-full 
        flex
        justify-center
        items-center
        gap-2
        border
        ${rounded ? "rounded-full" : "rounded-xl"}
        ${classNames || (outline ? "bg-white border-neutral-300 text-black hover:bg-neutral-50" : "bg-black border-black text-white hover:bg-neutral-800")}
      `}
    >
      {loading && (
        <AiOutlineLoading3Quarters className={`animate-spin text-lg ${outline ? 'text-black' : 'text-white'}`} />
      )}
      {Icon && !loading && <Icon size={24} className={`${isColor && "text-blue-600"}`} />}
      <span>{loading ? "Processing..." : label}</span>
    </button>
  );
}

export default Button;
