"use client";

import IndianRupee from "lucide-react/dist/esm/icons/indian-rupee";
import * as React from "react";
import { FieldErrors, UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

import FormField from "./FormField";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: string;
    description?: string;
    formatPrice?: boolean;
    register?: UseFormRegisterReturn;
    id: string;
    errors?: FieldErrors;
    customRightContent?: React.ReactNode;
    variant?: "vertical" | "horizontal";
    size?: "sm" | "md";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, description, formatPrice, register, id, required, errors, customRightContent, variant = "vertical", size = "md", ...props }, ref) => {
        const error = errors?.[id]?.message as string;

        const sizeClasses = {
            sm: "h-9 px-3 text-xs",
            md: "h-11 px-4 text-sm",
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
                <div className="relative group">
                    {formatPrice && (
                        <IndianRupee
                            size={size === "sm" ? 14 : 18}
                            className="text-muted-foreground absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none"
                        />
                    )}

                    <input
                        id={id}
                        type={type}
                        className={cn(
                            "w-full font-light bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed",
                            sizeClasses[size],
                            formatPrice ? (size === "sm" ? "pl-9" : "pl-12") : (size === "sm" ? "pl-4" : "pl-5"),
                            customRightContent ? (size === "sm" ? "pr-10" : "pr-12") : (size === "sm" ? "pr-4" : "pr-5"),
                            error
                                ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20"
                                : "border-border hover:border-border/80 focus:border-foreground focus:ring-1 focus:ring-foreground/10",
                            className
                        )}
                        ref={ref}
                        required={required}
                        {...register}
                        {...props}
                        onWheel={(e) => {
                            if (type === 'number') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />

                    {customRightContent && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            {customRightContent}
                        </div>
                    )}
                </div>
            </FormField>
        );
    }
);
Input.displayName = "Input";

export default Input;

