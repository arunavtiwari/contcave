"use client";

import IndianRupee from "lucide-react/dist/esm/icons/indian-rupee";
import * as React from "react";
import { FieldErrors, UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

import FormField from "./FormField";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
    formatPrice?: boolean;
    register?: UseFormRegisterReturn;
    id: string;
    errors?: FieldErrors;
    customRightContent?: React.ReactNode;
    variant?: "vertical" | "horizontal";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, description, formatPrice, register, id, required, errors, customRightContent, variant = "vertical", ...props }, ref) => {
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
                <div className="relative group">
                    {formatPrice && (
                        <IndianRupee
                            size={18}
                            className="text-muted-foreground absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none"
                        />
                    )}

                    <input
                        id={id}
                        type={type}
                        className={cn(
                            "w-full h-11 px-4 font-light bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed",
                            formatPrice ? "pl-10" : "pl-4",
                            customRightContent ? "pr-12" : "pr-4",
                            error
                                ? "border-destructive focus:border-destructive ring-destructive/20 focus:ring-4"
                                : "border-border hover:border-border/80 focus:border-primary focus:ring-4 focus:ring-primary/10",
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
