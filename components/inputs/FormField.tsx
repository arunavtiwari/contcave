"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    variant?: "vertical" | "horizontal";
    align?: "center" | "start";
    children: React.ReactNode;
    className?: string;
    labelWidth?: string;
    childWidth?: "full" | "auto";
}

const FormField = ({
    id,
    label,
    description,
    error,
    required,
    variant = "vertical",
    align = "center",
    children,
    className,
    labelWidth = "sm:w-1/3",
    childWidth = "full",
}: FormFieldProps) => {
    const isHorizontal = variant === "horizontal";

    return (
        <div className={cn(
            "flex w-full gap-1",
            isHorizontal
                ? cn("flex-col sm:flex-row sm:gap-10", 
                    childWidth === "auto" && "sm:justify-between",
                    align === "center" ? "sm:items-center" : "sm:items-start"
                )
                : "flex-col gap-1.5",
            className
        )}>
            {label && (
                <label
                    htmlFor={id}
                    className={cn(
                        "text-sm font-medium transition-colors",
                        isHorizontal ? cn(labelWidth, "text-foreground") : "text-foreground",
                        error ? "text-destructive" : ""
                    )}
                >
                    <span>
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </span>
                    {!isHorizontal && description && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                            {description}
                        </span>
                    )}
                    {isHorizontal && description && (
                        <p className="text-xs font-normal text-muted-foreground mt-1 leading-normal">
                            {description}
                        </p>
                    )}
                </label>
            )}

            <div className={cn(
                "flex",
                isHorizontal
                    ? cn("items-center", childWidth === "auto" ? "sm:w-auto shrink-0 sm:justify-end" : "flex-1 w-full")
                    : "flex-1 w-full flex-col items-stretch"
            )}>
                {children}

                {error && (
                    <p className="text-xs font-medium text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

export default FormField;
