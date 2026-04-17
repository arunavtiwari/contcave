"use client";

import Link from "next/link";
import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

type ButtonVariant = "default" | "outline" | "success" | "danger" | "ghost" | "secondary";

type ButtonSize = "sm" | "md";

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
  size?: ButtonSize;
  href?: string;
  target?: "_blank" | "_self";
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
  size = "md",
  href,
  target,
}: Props) {
  const effectiveVariant = outline ? "outline" : variant;

  const sizeClasses = {
    sm: "py-1.5 px-3 text-xs w-auto",
    md: "py-2 px-5 text-sm w-full",
  };

  const baseClasses = `relative font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 transition flex justify-center items-center gap-2 border hover:opacity-80 ${sizeClasses[size]}`;
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

  const content = (
    <>
      {loading && (
        <AiOutlineLoading3Quarters
          className={`animate-spin text-lg ${effectiveVariant === "outline" || effectiveVariant === "ghost" ? "text-black" : "text-white"}`}
        />
      )}
      {Icon && !loading && <Icon size={24} className={`${isColor && "text-blue-600"}`} />}
      <span>{loading ? "Processing..." : label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={finalClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button disabled={disabled || loading} onClick={onClick} className={finalClasses}>
      {content}
    </button>
  );
}

export default Button;
