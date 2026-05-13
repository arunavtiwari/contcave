"use client";

import React from "react";
import { MdInfoOutline } from "react-icons/md";

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
    const tooltipId = id && description ? `${id}-description` : undefined;

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
                        "flex min-h-5 items-center gap-1.5 text-sm font-medium leading-5 transition-colors",
                        isHorizontal ? cn(labelWidth, "text-foreground") : "text-foreground",
                        error ? "text-destructive" : ""
                    )}
                >
                    <label htmlFor={id} className="inline-flex h-5 min-w-0 items-center leading-5">
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {description && (
                        <span
                            aria-label={description}
                            aria-describedby={tooltipId}
                            className="group/help relative inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground [&>svg]:block"
                            tabIndex={0}
                        >
                            <MdInfoOutline aria-hidden="true" size={16} />
                            <span
                                id={tooltipId}
                                role="tooltip"
                                className="pointer-events-none absolute left-1/2 top-full z-50 mt-2.5 w-max max-w-64 -translate-x-1/2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs font-normal leading-5 text-foreground opacity-0 backdrop-blur-xl transition duration-150 ease-out before:absolute before:-top-1 before:left-1/2 before:block before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-45 before:border-l before:border-t before:border-border/60 before:bg-background/40 before:backdrop-blur-xl before:content-[''] group-hover/help:translate-y-0 group-hover/help:opacity-100 group-focus-visible/help:translate-y-0 group-focus-visible/help:opacity-100"
                            >
                                {description}
                            </span>
                        </span>
                    )}
                </div>
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
