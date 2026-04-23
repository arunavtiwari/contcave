import { cva, type VariantProps } from "class-variance-authority";
import React from "react";
import { IconType } from "react-icons";

import { cn } from "@/lib/utils";

const pillVariants = cva(
    "inline-flex items-center justify-center gap-1.5 font-medium tracking-wider rounded-full border border-transparent transition-all",
    {
        variants: {
            variant: {
                solid: "bg-foreground text-background",
                subtle: "bg-foreground/10 text-foreground",
                glass: "bg-background/80 backdrop-blur-md text-foreground",
                secondary: "bg-neutral-100 text-neutral-900 border-neutral-200",
                neutral: "bg-neutral-50 text-neutral-600",
                destructive: "bg-destructive text-destructive-foreground",
                success: "bg-success/10 text-success",
                warning: "bg-warning/10 text-warning",
                info: "bg-info/10 text-info",
                "card-feature": "bg-muted text-muted-foreground",
                "card-category": "bg-neutral-100 text-neutral-900",
                "card-rating": "bg-neutral-50 text-neutral-600",
                "card-muted": "bg-neutral-100/50 text-neutral-500",
            },
            size: {
                xs: "px-2 h-6 text-[10px]",
                sm: "px-2.5 h-7 text-xs",
                md: "px-3 h-9 text-sm",
            },
            clickable: {
                true: "cursor-pointer hover:opacity-85 active:scale-95",
            },
        },
        defaultVariants: {
            variant: "subtle",
            size: "sm",
        },
    }
);

interface PillProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pillVariants> {
    label: string | React.ReactNode;
    icon?: IconType;
}

const Pill: React.FC<PillProps> = ({
    label,
    variant,
    size,
    icon: Icon,
    className,
    onClick,
    ...props
}) => {
    return (
        <div
            onClick={onClick}
            className={cn(pillVariants({ variant, size, clickable: !!onClick, className }))}
            {...props}
        >
            {Icon && <Icon className="shrink-0" size={size === "xs" ? 10 : 12} />}
            <span>{label}</span>
        </div>
    );
};

export default Pill;
