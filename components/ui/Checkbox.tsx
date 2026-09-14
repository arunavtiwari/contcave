"use client";

import * as React from "react";
import { IoCheckmark } from "react-icons/io5";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
            <div className="flex items-center gap-2.5">
                <div className="relative flex items-center">
                    <input
                        type="checkbox"
                        className={cn(
                            "peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-md border border-border bg-background transition-all duration-150 checked:border-foreground checked:bg-foreground hover:border-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
                            className
                        )}
                        onChange={handleChange}
                        ref={ref}
                        {...props}
                    />
                    <IoCheckmark
                        size={13}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                    />
                </div>
                {label && (
                    <label
                        htmlFor={props.id}
                        className={cn(
                            "text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground",
                            props.disabled && "cursor-not-allowed"
                        )}
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
