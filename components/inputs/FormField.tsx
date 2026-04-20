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
    children: React.ReactNode;
    className?: string;
}

const FormField = ({
    id,
    label,
    description,
    error,
    required,
    variant = "vertical",
    children,
    className,
}: FormFieldProps) => {
    const isHorizontal = variant === "horizontal";

    return (
        <div className={cn(
            "flex w-full gap-1",
            isHorizontal ? "flex-col sm:flex-row sm:items-center sm:gap-10" : "flex-col gap-1.5",
            className
        )}>
            {label && (
                <label
                    htmlFor={id}
                    className={cn(
                        "text-sm font-medium transition-colors",
                        isHorizontal ? "sm:w-1/3 text-muted-foreground" : "text-foreground",
                        error ? "text-destructive" : ""
                    )}
                >
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                    {isHorizontal && description && (
                        <p className="text-xs font-normal text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </label>
            )}

            <div className={cn("flex-1 w-full", isHorizontal ? "" : "")}>
                {!isHorizontal && description && (
                    <p className="text-xs text-muted-foreground mb-1.5">{description}</p>
                )}

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
