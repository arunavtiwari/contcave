import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import React from "react";
import { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 transition active:scale-[0.98] flex justify-center items-center gap-2 border",
  {
    variants: {
      variant: {
        default: "bg-foreground border-foreground text-background",
        success: "bg-success border-success text-background",
        destructive: "bg-destructive border-destructive text-destructive-foreground",
        ghost: "bg-transparent border-transparent text-foreground",
        secondary: "bg-background/10 border-background/20 text-background",
        outline: "bg-background border-foreground/20 text-foreground",
      },
      size: {
        sm: "h-10 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-sm",
        xl: "h-14 px-10 text-base",
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
      { variant: "default", outline: true, className: "bg-background border-foreground text-foreground" },
      { variant: "success", outline: true, className: "bg-background border-success text-success" },
      { variant: "destructive", outline: true, className: "bg-background border-destructive text-destructive" },
      { variant: "ghost", outline: true, className: "bg-transparent border-border text-foreground" },
      { variant: "secondary", outline: true, className: "border-background/20 text-background" },
      // Icon only sizes
      { isIconOnly: true, size: "sm", className: "w-9 h-9 p-0" },
      { isIconOnly: true, size: "md", className: "w-11 h-11 p-0" },
      { isIconOnly: true, size: "lg", className: "w-12 h-12 p-0" },
      { isIconOnly: true, size: "xl", className: "w-14 h-14 p-0" },
      { isIconOnly: true, className: "rounded-lg border-none active:scale-95" },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      rounded: false,
      fit: false,
    },
  }
);

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
  icon?: IconType;
  isColor?: boolean;
  href?: string;
  target?: "_blank" | "_self";
  classNames?: string;
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
      className,
      classNames,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const isIconOnly = !label && !!Icon && !children;

    const finalClasses = cn(
      buttonVariants({ variant, size, outline, rounded, fit, isIconOnly, className: cn(className, classNames) })
    );

    const iconSize = {
      sm: 16,
      md: 20,
      lg: 24,
      xl: 28,
    }[size || "md"];

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
        {label && <span>{loading ? "Processing..." : label}</span>}
        {children && !loading && children}
        {!label && !children && loading && <span className="sr-only">Processing...</span>}
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className={finalClasses}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        type={type as "button" | "submit" | "reset"}
        disabled={disabled || loading}
        onClick={onClick}
        className={finalClasses}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

