import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinner = cva("inline-block shrink-0 animate-spin rounded-full border-muted-foreground/30 border-t-foreground", {
  variants: {
    size: {
      sm: "size-3.5 border-2",
      md: "size-5 border-2",
      lg: "size-16 border-4",
    },
  },
  defaultVariants: { size: "sm" },
});

/** The app's one loading spinner. Decorative: pair it with visible or sr-only text. */
export default function Spinner({ size, className }: VariantProps<typeof spinner> & { className?: string }) {
  return <span aria-hidden="true" className={cn(spinner({ size }), className)} />;
}
