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
  classNames?:string
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
      className={`relative disabled:opacity-70 disabled:cursor-not-allowed rounded-lg hover:opacity-80 transition w-full  ${
       !classNames? (outline ? "bg-white border-black text-black" : "bg-rose-500 border-rose-500 text-white"): classNames
      }  ${ !classNames ? (small ? "text-sm font-light py-1 border-[1px]" : "text-md font-semibold py-3 border-2"):classNames} 
      
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
