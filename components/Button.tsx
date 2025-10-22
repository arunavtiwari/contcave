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
  small?: boolean;
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
  small,
  icon: Icon,
  isColor,
  classNames,
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative 
        disabled:opacity-70 
        disabled:cursor-not-allowed 
        hover:opacity-90 
        py-[10px]
        transition 
        w-full 
        flex
        justify-center
        items-center
        gap-2
        border
        ${rounded ? "rounded-full" : "rounded-md"}
        ${classNames || (outline ? "bg-white border border-black text-black" : "bg-black border border-black text-white")}
      `}
    >
      {loading && (
        <AiOutlineLoading3Quarters className="animate-spin text-white text-lg" />
      )}
      {Icon && !loading && <Icon size={24} className={`${isColor && "text-blue-600"}`} />}
      <span>{loading ? "Processing..." : label}</span>
    </button>
  );
}

export default Button;
