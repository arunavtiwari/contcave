"use client";

import * as React from "react";
import { FieldErrors } from "react-hook-form";

import FormField from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    description?: string;
    id: string;
    error?: string;
    errors?: FieldErrors;
    variant?: "vertical" | "horizontal";
    /** compact: a one-line box that grows as you type, e.g. a chat composer. */
    size?: "compact" | "sm" | "md";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, description, id, required, error: propError, errors, variant = "vertical", size = "sm", ...props }, ref) => {
        const error = (errors?.[id]?.message as string) || propError;

        const sizeClasses = {
            // 16px on phones so iOS does not zoom into the field.
            compact: "text-base sm:text-sm px-3.5 py-2.5 min-h-11",
            sm: "text-sm p-3 min-h-[80px]",
            md: "text-sm p-3.5 min-h-[100px]",
        };

        return (
            <FormField
                id={id}
                label={label}
                description={description}
                error={error}
                required={required}
                variant={variant}
            >
                <textarea
                    id={id}
                    className={cn(
                        "w-full font-normal bg-background border rounded-xl transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground/70 focus:ring-0",
                        sizeClasses[size],
                        error
                            ? "border-destructive focus:border-destructive"
                            : "border-border hover:border-foreground/40 focus:border-foreground",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </FormField>
        );
    }
);
Textarea.displayName = "Textarea";

export default Textarea;
