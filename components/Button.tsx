"use client";

import React from "react";
import { IconType } from "react-icons";

type Props = {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: IconType;
  isColor?: boolean;
  classNames?: string
};

function Button({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
  isColor,
  classNames,
}: Props) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative 
        disabled:opacity-70 
        disabled:cursor-not-allowed 
        hover:opacity-80 
        rounded-md
        py-3 
        transition 
        w-full 
        ${classNames || (outline ? "bg-white border-black text-black" : "bg-black border-red-500 text-white")}
      `}
    >
      {Icon && (
        <Icon
          size={24}
          className={`absolute left-4 top-3 ${isColor && "text-blue-600"}`}
        />
      )}
      {label}
    </button>
  );
}

export default Button;
