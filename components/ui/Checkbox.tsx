"use client";

import Check from "lucide-react/dist/esm/icons/check";
import * as React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
        };

        return (
            <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                    <input
                        type="checkbox"
                        className={`
              peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-neutral-300 
              bg-background transition-all checked:border-foreground checked:bg-foreground hover:border-foreground
              focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
              ${className}
            `}
                        onChange={handleChange}
                        ref={ref}
                        {...props}
                    />
                    <Check
                        size={14}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background opacity-0 transition-opacity peer-checked:opacity-100"
                    />
                </div>
                {label && (
                    <label
                        htmlFor={props.id}
                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${props.disabled ? "cursor-not-allowed" : ""}`}
                    >
                        {label}
                    </label>
                )}
            </div>
        );
    }
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
