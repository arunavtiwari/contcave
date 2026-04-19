import React from "react";
import { IconType } from "react-icons";

import { cn } from "@/lib/utils";

export type PillVariant = "subtle" | "solid" | "glass";
export type PillColor = "default" | "secondary" | "destructive" | "success" | "warning" | "neutral";
export type PillSize = "xs" | "sm" | "md";

interface PillProps {
    label: string | React.ReactNode;
    variant?: PillVariant;
    color?: PillColor;
    size?: PillSize;
    icon?: IconType;
    className?: string;
    onClick?: () => void;
}

const Pill: React.FC<PillProps> = ({
    label,
    variant = "subtle",
    color = "default",
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

    const variantClasses = {
        subtle: {
            default: "bg-foreground/10 text-foreground",
            secondary: "bg-foreground/4 text-foreground/80",
            destructive: "bg-destructive/10 text-destructive",
            success: "bg-success/10 text-success",
            warning: "bg-warning/10 text-warning",
            neutral: "bg-muted text-muted-foreground",
        },
        solid: {
            default: "bg-foreground text-background",
            secondary: "bg-muted text-foreground",
            destructive: "bg-destructive text-destructive-foreground",
            success: "bg-success text-white",
            warning: "bg-warning text-white",
            neutral: "bg-neutral-200 text-neutral-700",
        },
        glass: {
            default: "bg-background/90 backdrop-blur-sm text-foreground",
            secondary: "bg-background/5 backdrop-blur-sm text-background",
            destructive: "bg-destructive/20 backdrop-blur-md border border-destructive/20 text-destructive",
            success: "bg-success/20 backdrop-blur-md border border-success/20 text-success",
            warning: "bg-warning/20 backdrop-blur-md border border-warning/20 text-warning",
            neutral: "bg-background/40 backdrop-blur-md border border-border/10 text-foreground",
        },
    };

    const colorScheme = variantClasses[variant][color] || variantClasses[variant].default;

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
