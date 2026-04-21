"use client";

import Link from "next/link";
import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

type ButtonVariant = "default" | "outline" | "success" | "destructive" | "ghost" | "secondary";

type ButtonSize = "sm" | "md" | "lg" | "xl";

type Props = {
  label?: string;
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
  fit?: boolean;
  href?: string;
  target?: "_blank" | "_self";
  type?: "button" | "submit" | "reset";
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
  fit,
  href,
  target,
  type = "button",
}: Props) {

  const sizeClasses = {
    sm: "h-10 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-12 px-8 text-sm",
    xl: "h-14 px-10 text-base",
  };

  const widthClass = fit ? "w-fit" : "w-full";

  const baseClasses = `relative font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 transition active:scale-[0.98] flex justify-center items-center gap-2 border hover:opacity-90 ${sizeClasses[size]} ${widthClass}`;
  const roundedClass = rounded ? "rounded-full" : "rounded-xl";

  const variantClasses = {
    default: {
      solid: "bg-foreground border-foreground text-background",
      outline: "bg-background border-foreground text-foreground",
    },
    success: {
      solid: "bg-success border-success text-background",
      outline: "bg-background border-success text-success",
    },
    destructive: {
      solid: "bg-destructive border-destructive text-destructive-foreground",
      outline: "bg-background border-destructive text-destructive",
    },
    ghost: {
      solid: "bg-transparent border-transparent text-foreground",
      outline: "bg-transparent border-border text-foreground",
    },
    secondary: {
      solid: "bg-background/10 border-background/20 text-background",
      outline: "border-background/20 text-background",
    },
    outline: {
      solid: "bg-background border-foreground/20 text-foreground",
      outline: "bg-background border-foreground/20 text-foreground",
    }
  } as const;

  const finalClasses = `${baseClasses} ${roundedClass} ${variantClasses[variant][outline ? "outline" : "solid"]} ${classNames || ""}`;

  const content = (
    <>
      {loading && (
        <AiOutlineLoading3Quarters
          className={`animate-spin text-lg ${outline || variant === "ghost" ? "text-foreground" : "text-background"}`}
        />
      )}
      {Icon && !loading && <Icon size={20} className={`${isColor && "text-info"}`} />}
      {label && <span>{loading ? "Processing..." : label}</span>}
      {!label && loading && <span className="sr-only">Processing...</span>}
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
    <button type={type} disabled={disabled || loading} onClick={onClick} className={finalClasses}>
      {content}
    </button>
  );
}

export default Button;

