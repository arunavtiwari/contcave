"use client";

import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

type ButtonVariant = "default" | "outline" | "success" | "danger" | "ghost" | "secondary";

type Props = {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  rounded?: boolean;
  icon?: IconType;
  isColor?: boolean;
  classNames?: string;
  variant?: ButtonVariant;
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
  variant = "default",
}: Props) {

  const effectiveVariant = outline ? "outline" : variant;

  const baseClasses = "relative font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 py-2 px-5 transition w-full flex justify-center items-center gap-2 border hover:opacity-80";
  const roundedClass = rounded ? "rounded-full" : "rounded-xl";

  const variantClasses = {
    default: "bg-black border-black text-white",
    outline: "bg-white border-neutral-300 text-black hover:bg-neutral-50",
    success: "bg-green-600 border-green-600 text-white hover:bg-green-700",
    danger: "bg-rose-500 border-rose-500 text-white hover:bg-rose-600",
    ghost: "bg-transparent border-transparent text-black hover:bg-neutral-100",
    secondary: "bg-neutral-200 border-neutral-200 text-black hover:bg-neutral-300",
  };

  const finalClasses = `${baseClasses} ${roundedClass} ${variantClasses[effectiveVariant]} ${classNames || ""}`;

  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={finalClasses}
    >
      {loading && (
        <AiOutlineLoading3Quarters className={`animate-spin text-lg ${effectiveVariant === 'outline' || effectiveVariant === 'ghost' ? 'text-black' : 'text-white'}`} />
      )}
      {Icon && !loading && <Icon size={24} className={`${isColor && "text-blue-600"}`} />}
      <span>{loading ? "Processing..." : label}</span>
    </button>
  );
}

export default Button;
