"use client";

import { IndianRupee } from "lucide-react";
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
            <div className="w-full relative">
                {label && (
                    <label
                        htmlFor={id}
                        className={`
              absolute 
              text-md
              duration-150 
              transform 
              -translate-y-3 
              top-5 
              z-10 
              origin-left 
              ${formatPrice ? "left-9" : "left-4"}
              peer-placeholder-shown:scale-100 
              peer-placeholder-shown:translate-y-0 
              peer-focus:scale-75
              peer-focus:-translate-y-4
              ${hasError ? "text-rose-500" : "text-zinc-400"}
            `}
                    >
                        {label}
                        {required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                {formatPrice && (
                    <IndianRupee
                        size={18}
                        className="
              text-neutral-700
              absolute
              top-5
              left-2
            "
                    />
                )}

                <input
                    id={id}
                    type={type}
                    className={`
            peer
            w-full
            p-4
            pt-6 
            font-light 
            bg-white 
            border-2
            rounded-md
            outline-none
            transition
            disabled:opacity-70
            disabled:cursor-not-allowed
            ${formatPrice ? "pl-9" : "pl-4"}
            ${hasError ? "border-rose-500" : "border-neutral-300"}
            ${hasError ? "focus:border-rose-500" : "focus:border-black"}
            ${className}
          `}
                    placeholder=" "
                    ref={ref}
                    required={required}
                    {...register}
                    {...props}
                />

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
