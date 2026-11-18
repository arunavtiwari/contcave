import { cva } from "class-variance-authority";

/** The round buttons stacked in the bottom-right corner (Spot, WhatsApp, back to top): one size and shape. */
export const floatingButton = cva(
  "inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border transition-colors focus-visible:outline-none",
  {
    variants: {
      tone: {
        dark: "border-foreground bg-foreground text-background hover:bg-foreground/90 focus-visible:border-neutral-500",
        whatsapp: "border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe5d] focus-visible:border-foreground",
      },
    },
    defaultVariants: { tone: "dark" },
  }
);
