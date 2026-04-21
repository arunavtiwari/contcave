"use client";

import { IndianRupee } from "lucide-react";
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
    customLeftContent?: React.ReactNode;
    customRightContent?: React.ReactNode;
    variant?: "vertical" | "horizontal";
    size?: "sm" | "md";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, description, formatPrice, register, id, required, errors, customLeftContent, customRightContent, variant = "vertical", size = "md", ...props }, ref) => {
        const error = errors?.[id]?.message as string;

        const sizeClasses = {
            sm: "h-10 text-xs",
            md: "h-11 text-sm",
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
                    {customLeftContent && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-muted-foreground text-sm select-none z-10">
                            {customLeftContent}
                        </div>
                    )}

                    {formatPrice && (
                        <IndianRupee
                            size={size === "sm" ? 14 : 18}
                            className="text-muted-foreground absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10"
                        />
                    )}

                    <input
                        id={id}
                        type={type}
                        className={cn(
                            "w-full font-normal bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed",
                            sizeClasses[size],
                            formatPrice ? (size === "sm" ? "pl-9" : "pl-12") : (customLeftContent ? "pl-41.25" : "pl-3"),
                            customRightContent ? (size === "sm" ? "pr-10" : "pr-12") : "pr-3",
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

