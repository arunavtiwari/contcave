"use client";

import React from "react";
import { FiAlertCircle } from "react-icons/fi";
import { MdInfoOutline } from "react-icons/md";

import { cn } from "@/lib/utils";

import Tooltip from "./Tooltip";

export interface FormFieldProps {
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
                <div
                    className={cn(
                        "flex min-h-5 items-center gap-1.5 text-sm font-medium leading-5 transition-colors text-foreground",
                        isHorizontal && labelWidth
                    )}
                >
                    <label htmlFor={id} className="inline-flex h-5 min-w-0 items-center leading-5">
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {description && (
                        <Tooltip content={description} side="top" sideOffset={6}>
                            <button
                                type="button"
                                aria-label={description}
                                className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground [&>svg]:block"
                            >
                                <MdInfoOutline aria-hidden="true" size={16} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            )}

            <div className={cn(
                "flex flex-col items-stretch",
                isHorizontal
                    ? cn(childWidth === "auto" ? "sm:w-auto shrink-0 sm:items-end" : "flex-1 w-full")
                    : "flex-1 w-full"
            )}>
                {children}

                {error && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-destructive animate-in fade-in-50 slide-in-from-top-0.5 duration-150"
                    >
                        <FiAlertCircle className="size-3.5 shrink-0 stroke-[2.25]" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormField;
