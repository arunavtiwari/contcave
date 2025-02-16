"use client";

import React from "react";
import { IconType } from "react-icons";

type Props = {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  rounded?: boolean;
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
  rounded,
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
        hover:opacity-90 
        py-2 
        transition 
        w-full 
        ${rounded ? " rounded-full" : "rounded-md"}
        ${classNames || (outline ? "bg-white border border-black text-black" : "bg-black border-red-500 text-white")}
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
