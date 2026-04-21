import React from "react";
import { IconType } from "react-icons";

import { cn } from "@/lib/utils";

export type PillVariant =
    | "solid"
    | "subtle"
    | "glass"
    | "secondary"
    | "neutral"
    | "destructive"
    | "success"
    | "warning"
    | "info"
    | "card-feature"
    | "card-category"
    | "card-rating"
    | "card-muted";

export type PillSize = "xs" | "sm" | "md";

interface PillProps {
    label: string | React.ReactNode;
    variant?: PillVariant;
    size?: PillSize;
    icon?: IconType;
    className?: string;
    onClick?: () => void;
}

const Pill: React.FC<PillProps> = ({
    label,
    variant = "subtle",
    size = "sm",
    icon: Icon,
    className,
    onClick,
}) => {
    const isClickable = !!onClick;

    const sizeClasses = {
        xs: "px-2 h-6 text-[10px]",
        sm: "px-2.5 h-7 text-xs",
        md: "px-3 h-9 text-sm",
    };

    const variantClasses: Record<PillVariant, string> = {
        solid: "bg-foreground text-background",
        subtle: "bg-foreground/10 text-foreground",
        glass: "bg-background/80 backdrop-blur-md text-foreground",
        secondary: "bg-neutral-100 text-neutral-900",
        neutral: "bg-neutral-50 text-neutral-600",
        destructive: "bg-destructive text-destructive-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        "card-feature": "bg-muted text-muted-foreground",
        "card-category": "bg-neutral-100 text-neutral-900",
        "card-rating": "bg-neutral-50 text-neutral-600",
        "card-muted": "bg-neutral-100/50 text-neutral-500",
    };

    const colorScheme = variantClasses[variant] || variantClasses.subtle;

    return (
        <div
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center gap-1.5 font-medium tracking-wider rounded-full border border-transparent transition-all",
                sizeClasses[size],
                colorScheme,
                isClickable && "cursor-pointer hover:opacity-85 active:scale-95",
                className
            )}
        >
            {Icon && <Icon className="shrink-0" size={size === "xs" ? 10 : 12} />}
            <span>{label}</span>
        </div>
    );
};

export default Pill;
