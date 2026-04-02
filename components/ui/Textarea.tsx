"use client";

import * as React from "react";
import { FieldErrors } from "react-hook-form";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    id: string;
    errors?: FieldErrors;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, id, errors, ...props }, ref) => {
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
              ${hasError ? "text-rose-500" : "text-gray-700"}
            `}
                    >
                        {label}
                    </label>
                )}

                <textarea
                    id={id}
                    className={`
             w-full
             p-3
             font-light 
             bg-white 
             border
             rounded-xl
             focus:outline-none
             focus:border-black
             transition
             disabled:opacity-70
             disabled:cursor-not-allowed
             min-h-25
             ${hasError ? "border-rose-500 focus:border-rose-500" : "border-neutral-200 hover:border-neutral-300"}
             ${className}
           `}
                    ref={ref}
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
Textarea.displayName = "Textarea";

export default Textarea;
