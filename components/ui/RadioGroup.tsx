"use client";

import * as Radix from "@radix-ui/react-radio-group";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const item = cva(
  "flex min-h-11 w-full cursor-pointer gap-3 rounded-xl border p-3 text-left transition outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      layout: {
        list: "items-start border-border data-[state=checked]:border-foreground",
        cards: "flex-1 items-center justify-center border-border hover:border-border/80 data-[state=checked]:border-foreground data-[state=checked]:bg-muted",
      },
    },
    defaultVariants: { layout: "list" },
  }
);

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface RadioGroupProps<T extends string> {
  options: readonly RadioOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  name?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** "list" stacks options with a radio dot; "cards" lays out centred choice cards side by side. */
  layout?: "list" | "cards";
  className?: string;
}

/** Accessible single-choice group (Radix: roving focus, arrow keys) rendered as option cards. */
export default function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  name,
  disabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  layout = "list",
  className,
}: RadioGroupProps<T>) {
  return (
    <Radix.Root
      value={value ?? ""}
      onValueChange={(next) => onChange(next as T)}
      name={name}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={cn(layout === "cards" ? "flex w-full gap-4" : "space-y-2", className)}
    >
      {options.map((option) => (
        <Radix.Item key={option.value} value={option.value} className={item({ layout })}>
          {layout === "list" && (
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-foreground">
              <Radix.Indicator className="size-2 rounded-full bg-foreground" />
            </span>
          )}
          <span className={cn(layout === "cards" && "text-center")}>
            <span className={cn("block font-medium text-foreground", layout === "list" && "text-sm")}>{option.label}</span>
            {option.hint && <span className="block text-sm text-muted-foreground">{option.hint}</span>}
          </span>
        </Radix.Item>
      ))}
    </Radix.Root>
  );
}
