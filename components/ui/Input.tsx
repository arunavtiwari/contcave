"use client";

import IndianRupee from "lucide-react/dist/esm/icons/indian-rupee";
import * as React from "react";
import { FieldErrors, UseFormRegisterReturn } from "react-hook-form";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    formatPrice?: boolean;
    register?: UseFormRegisterReturn;
    id: string;
    errors?: FieldErrors;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, formatPrice, register, id, required, errors, ...props }, ref) => {
        const hasError = errors?.[id];

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className={`
              block 
              text-sm 
              font-medium 
              mb-1
              ${hasError ? "text-gray-700" : "text-gray-700"}
            `}
                    >
                        {label}
                        {required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    {formatPrice && (
                        <IndianRupee
                            size={18}
                            className="
                text-neutral-700
                absolute
                top-1/2
                -translate-y-1/2
                left-3
              "
                        />
                    )}

                    <input
                        id={id}
                        type={type}
                        className={`
              w-full
              px-4
              py-2.5
              font-light 
              bg-white 
              border-2
              rounded-xl
              focus:outline-none
              focus:ring-2
              focus:ring-black
              focus:border-transparent
              transition
              disabled:opacity-70
              disabled:cursor-not-allowed
              ${formatPrice ? "pl-10" : "pl-4"}
              ${hasError ? "border-rose-500 focus:ring-rose-500" : "border-neutral-200"}
              ${className}
            `}
                        ref={ref}
                        required={required}
                        {...register}
                        {...props}
                    />
                </div>

                {hasError && (
                    <p className="text-rose-500 text-sm mt-1">
                        {errors?.[id]?.message as string}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export default Input;
