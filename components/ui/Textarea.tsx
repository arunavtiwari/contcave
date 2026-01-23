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
              left-4
              peer-placeholder-shown:scale-100 
              peer-placeholder-shown:translate-y-0 
              peer-focus:scale-75
              peer-focus:-translate-y-4
              ${hasError ? "text-rose-500" : "text-zinc-400"}
            `}
                    >
                        {label}
                    </label>
                )}

                <textarea
                    id={id}
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
            min-h-[100px]
            ${hasError ? "border-rose-500" : "border-neutral-300"}
            ${hasError ? "focus:border-rose-500" : "focus:border-black"}
            ${className}
          `}
                    placeholder=" "
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
