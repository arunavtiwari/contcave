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
  children?: React.ReactNode;
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
  children,
}: Props) {

  const isIconOnly = !label && !!Icon && !children;
  const sizeClasses = {
    sm: isIconOnly ? "w-9 h-9" : "h-10 px-4 text-xs",
    md: isIconOnly ? "w-11 h-11" : "h-11 px-6 text-sm",
    lg: isIconOnly ? "w-12 h-12" : "h-12 px-8 text-sm",
    xl: isIconOnly ? "w-14 h-14" : "h-14 px-10 text-base",
  };

  const widthClass = isIconOnly ? "" : fit ? "w-fit" : "w-full";

  const activeScale = isIconOnly ? "active:scale-95" : "active:scale-[0.98]";
  const baseClasses = `relative font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 transition ${activeScale} flex justify-center items-center gap-2 ${isIconOnly ? "" : "border"} hover:opacity-90 ${sizeClasses[size]} ${widthClass}`;

  const roundedClass = rounded ? "rounded-full" : isIconOnly ? "rounded-lg" : "rounded-xl";

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
      solid: isIconOnly ? "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border-transparent" : "bg-transparent border-transparent text-foreground",
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

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  }[size];

  const content = (
    <>
      {loading && (
        <AiOutlineLoading3Quarters
          className={`animate-spin text-lg ${outline || variant === "ghost" ? "text-foreground" : "text-background"}`}
        />
      )}
      {Icon && !loading && <Icon size={iconSize} className={`${isColor && "text-info"}`} />}
      {label && <span>{loading ? "Processing..." : label}</span>}
      {children && !loading && children}
      {!label && !children && loading && <span className="sr-only">Processing...</span>}
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

