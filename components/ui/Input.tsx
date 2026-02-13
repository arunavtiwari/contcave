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
    customRightContent?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, formatPrice, register, id, required, errors, customRightContent, ...props }, ref) => {
        const hasError = errors?.[id];

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="
              block 
              text-sm 
              font-medium 
              mb-1
              text-gray-700
            "
                    >
                        {label}
                        {required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative group">
                    {formatPrice && (
                        <IndianRupee
                            size={18}
                            className="
                text-neutral-700
                absolute
                top-1/2
                -translate-y-1/2
                left-3
                pointer-events-none
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
              focus:border-black
              transition
              disabled:opacity-70
              disabled:cursor-not-allowed
              ${formatPrice ? "pl-10" : "pl-4"}
              ${customRightContent ? "pr-12" : "pr-4"}
              ${hasError ? "border-rose-500 focus:border-rose-500" : "border-neutral-200 hover:border-neutral-300"}
              ${className}
            `}
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
