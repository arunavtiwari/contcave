"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border font-medium transition-colors focus-visible:border-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      size: {
        xs: "h-7 px-2.5 text-[11px]",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
      },
      selected: {
        true: "border-foreground bg-foreground text-background focus-visible:border-neutral-500",
        false: "border-border bg-background text-foreground hover:bg-muted",
      },
    },
    defaultVariants: { size: "sm", selected: false },
  }
);

type ToggleChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> &
  Omit<VariantProps<typeof chip>, "selected"> & {
    /** On/off state. Leave undefined for a chip that runs an action instead of toggling. */
    selected?: boolean;
  };

/** A pill-shaped choice: tag pickers, quick-add chips and preset values. */
export default function ToggleChip({ selected, size, className, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={props.role ? undefined : selected}
      className={cn(chip({ size, selected: Boolean(selected) }), className)}
      {...props}
    />
  );
}
