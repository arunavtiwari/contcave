"use client";

import * as React from "react";
import { FieldErrors } from "react-hook-form";

import { cn } from "@/lib/utils";

import FormField from "./FormField";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    description?: string;
    id: string;
    errors?: FieldErrors;
    variant?: "vertical" | "horizontal";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, description, id, required, errors, variant = "vertical", ...props }, ref) => {
        const error = errors?.[id]?.message as string;

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
                        "w-full p-3 font-light bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed min-h-25",
                        error
                            ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20"
                            : "border-border hover:border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/10",
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
