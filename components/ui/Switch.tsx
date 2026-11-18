"use client";

import * as Radix from "@radix-ui/react-switch";
import { cva } from "class-variance-authority";
import { FaBolt } from "react-icons/fa";

import FormField from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

const track = cva(
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-neutral-200 transition-colors outline-none focus-visible:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            size: { default: "h-[26px] w-12", sm: "h-[22px] w-10" },
            tone: { default: "data-[state=checked]:bg-neutral-900", success: "data-[state=checked]:bg-success" },
        },
        defaultVariants: { size: "default", tone: "default" },
    }
);

const thumb = cva(
    "pointer-events-none flex items-center justify-center rounded-full bg-white transition-transform",
    {
        variants: {
            size: {
                default: "size-5 translate-x-px data-[state=checked]:translate-x-[23px]",
                sm: "size-4 translate-x-px data-[state=checked]:translate-x-[19px]",
            },
        },
        defaultVariants: { size: "default" },
    }
);

export interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    "aria-label"?: string;
    className?: string;
    size?: "default" | "sm";
    /** "success" colours the on state green. */
    tone?: "default" | "success";
    /** "bolt" shows a lightning icon on the thumb while on (instant booking). */
    styleVariant?: "default" | "bolt";
    label?: string;
    description?: string;
    required?: boolean;
    variant?: "vertical" | "horizontal";
    error?: string;
    labelWidth?: string;
    childWidth?: "full" | "auto";
}

/** Accessible on/off switch (Radix: role="switch", Space/Enter, aria-checked) inside the shared FormField. */
export default function Switch({
    checked = false,
    onChange,
    disabled,
    id,
    "aria-label": ariaLabel,
    className,
    size = "default",
    tone = "default",
    styleVariant = "default",
    label,
    description,
    required,
    variant = "vertical",
    error,
    labelWidth,
    childWidth,
}: SwitchProps) {
    return (
        <FormField
            id={id}
            label={label}
            description={description}
            required={required}
            variant={variant}
            error={error}
            labelWidth={labelWidth}
            childWidth={childWidth}
        >
            <Radix.Root
                id={id}
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
                aria-label={ariaLabel ?? label}
                className={cn(track({ size, tone }), className)}
            >
                <Radix.Thumb className={thumb({ size })}>
                    {styleVariant === "bolt" && checked && (
                        <FaBolt aria-hidden="true" className={cn("text-warning", size === "sm" ? "size-2.5" : "size-3.5")} />
                    )}
                </Radix.Thumb>
            </Radix.Root>
        </FormField>
    );
}
