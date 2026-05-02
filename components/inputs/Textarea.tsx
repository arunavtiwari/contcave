"use client";

import * as React from "react";
import { FieldErrors } from "react-hook-form";

import FormField from "@/components/inputs/FormField";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    description?: string;
    id: string;
    errors?: FieldErrors;
    variant?: "vertical" | "horizontal";
    size?: "sm" | "md";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, description, id, required, errors, variant = "vertical", size = "sm", ...props }, ref) => {
        const error = errors?.[id]?.message as string;

        const sizeClasses = {
            sm: "text-sm p-2.5 min-h-[80px]",
            md: "text-sm p-3 min-h-[100px]",
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
                        "w-full font-normal bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed text-foreground",
                        sizeClasses[size],
                        error
                            ? "border-destructive focus:border-destructive"
                            : "border-border hover:border-border/80 focus:border-foreground",
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

