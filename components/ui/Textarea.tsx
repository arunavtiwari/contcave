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
    size?: "sm" | "md";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, description, id, required, error: propError, errors, variant = "vertical", size = "sm", ...props }, ref) => {
        const error = (errors?.[id]?.message as string) || propError;

        const sizeClasses = {
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
                            ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20"
                            : "border-border hover:border-foreground/40 focus:border-foreground focus:ring-1 focus:ring-foreground/20",
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
