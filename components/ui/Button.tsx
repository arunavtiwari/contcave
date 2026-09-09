"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import Tooltip from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative flex cursor-pointer items-center justify-center gap-2 border font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-foreground border-foreground text-background",
        success: "bg-success border-success text-background",
        destructive: "bg-destructive border-destructive text-destructive-foreground",
        ghost: "bg-transparent border-transparent text-foreground",
        secondary: "bg-background/10 border-background/20 text-background",
        outline: "bg-background border-border text-foreground hover:border-foreground/30 hover:bg-muted",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-6 text-base",
      },
      outline: {
        true: "",
      },
      rounded: {
        true: "rounded-full",
        false: "rounded-xl",
      },
      fit: {
        true: "w-fit",
        false: "w-full",
      },
      isIconOnly: {
        true: "",
      },
    },
    compoundVariants: [
      { variant: "default", outline: true, className: "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted" },
      { variant: "success", outline: true, className: "bg-background border-success text-success" },
      { variant: "destructive", outline: true, className: "bg-background border-destructive text-destructive" },
      { variant: "ghost", outline: true, className: "bg-transparent border-border text-foreground" },
      { variant: "secondary", outline: true, className: "border-background/20 text-background" },
      { isIconOnly: true, outline: true, className: "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted" },
      // Icon only sizes
      { isIconOnly: true, size: "sm", className: "w-9 h-9 p-0" },
      { isIconOnly: true, size: "md", className: "w-11 h-11 p-0" },
      { isIconOnly: true, size: "lg", className: "w-12 h-12 p-0" },
      { isIconOnly: true, className: "rounded-xl active:scale-95" },
    ],
    defaultVariants: {
      variant: "default",
      size: "sm",
      rounded: false,
      fit: false,
    },
  }
);

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement>, VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
  icon?: IconType;
  isColor?: boolean;
  href?: string;
  target?: "_blank" | "_self";
  className?: string;
  tooltip?: string;
}

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  (
    {
      label,
      loading,
      outline,
      rounded,
      icon: Icon,
      isColor,
      href,
      target,
      type = "button",
      variant,
      size,
      fit,
      isIconOnly,
      className,
      children,
      disabled,
      tooltip,
      title,
      onClick,
      ...props
    },
    ref
  ) => {
    const computedIsIconOnly = isIconOnly !== undefined ? isIconOnly : (!label && !!Icon && !children);

    const computedFit = computedIsIconOnly ? true : fit;

    const finalClasses = cn(
      buttonVariants({ variant, size, outline, rounded, fit: computedFit, isIconOnly: computedIsIconOnly }),
      className
    );

    const iconSize = {
      sm: 16,
      md: 20,
      lg: 24,
    }[size || "sm"];

    const content = (
      <>
        {loading && (
          <AiOutlineLoading3Quarters
            className={cn(
              "animate-spin text-lg",
              outline || variant === "ghost" ? "text-foreground" : "text-background"
            )}
          />
        )}
        {Icon && !loading && (
          <Icon size={iconSize} className={cn(isColor && "text-info")} />
        )}
        {label && <span className="leading-none">{loading ? "Processing..." : label}</span>}
        {children && !loading && children}
        {!label && !children && loading && <span className="sr-only">Processing...</span>}
      </>
    );

    const commonProps = {
      ...props,
      title: tooltip ? undefined : title,
    };

    const button = href ? (
        <Link
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className={finalClasses}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...commonProps}
        >
          {content}
        </Link>
    ) : (
      <button
        type={type as "button" | "submit" | "reset"}
        disabled={disabled || loading}
        onClick={onClick}
        className={finalClasses}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...commonProps}
      >
        {content}
      </button>
    );

    if (tooltip) {
      return (
        <Tooltip content={tooltip}>
          <span className={cn("inline-flex", computedFit ? "w-fit" : "w-full")}>
            {button}
          </span>
        </Tooltip>
      );
    }

    return button;
  }
);

Button.displayName = "Button";

export default Button;

