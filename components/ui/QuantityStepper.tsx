"use client";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const box = cva("flex items-center overflow-hidden rounded-full border border-border text-sm", {
  variants: { size: { sm: "h-8", md: "h-10" }, fill: { true: "w-full", false: "w-fit" } },
  defaultVariants: { size: "sm", fill: false },
});

const step =
  "flex h-full min-w-9 flex-1 cursor-pointer items-center justify-center bg-muted text-base font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:bg-neutral-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground/50";

const addButton = cva(
  "cursor-pointer rounded-full border border-foreground bg-foreground px-4 font-semibold text-background transition-opacity hover:opacity-90 focus-visible:border-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: { size: { sm: "h-8 text-xs", md: "h-10 text-sm" }, fill: { true: "w-full", false: "w-fit" } },
    defaultVariants: { size: "sm", fill: false },
  }
);

type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** Most the guest can take; 0 shows "Unavailable". */
  max?: number;
  /** Names the item in the − and + labels for screen readers. */
  itemName: string;
  size?: "sm" | "md";
  fill?: boolean;
  disabled?: boolean;
  className?: string;
};

/** "Add" until something is picked, then − count +. Used for add-ons and equipment. */
export default function QuantityStepper({
  value,
  onChange,
  max = Number.POSITIVE_INFINITY,
  itemName,
  size = "sm",
  fill = false,
  disabled,
  className,
}: QuantityStepperProps) {
  if (max === 0) return <span className={cn("text-xs text-muted-foreground", className)}>Unavailable</span>;

  if (value === 0) {
    return (
      <button type="button" disabled={disabled} onClick={() => onChange(1)} aria-label={`Add ${itemName}`} className={cn(addButton({ size, fill }), className)}>
        Add
      </button>
    );
  }

  return (
    <div role="group" aria-label={`${itemName} quantity`} className={cn(box({ size, fill }), className)}>
      <button type="button" disabled={disabled} aria-label={`Remove one ${itemName}`} onClick={() => onChange(Math.max(0, value - 1))} className={step}>
        −
      </button>
      <span aria-live="polite" className="min-w-9 flex-1 text-center tabular-nums">{value}</span>
      <button type="button" disabled={disabled || value >= max} aria-label={`Add one more ${itemName}`} onClick={() => onChange(Math.min(max, value + 1))} className={step}>
        +
      </button>
    </div>
  );
}
