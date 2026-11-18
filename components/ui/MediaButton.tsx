"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import type { IconType } from "react-icons";

import { cn } from "@/lib/utils";

const mediaButton = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      tone: {
        /** Over photos and video: dark glass. */
        dark: "border-background/30 bg-foreground/55 text-background backdrop-blur-md hover:bg-foreground/75 focus-visible:border-background",
        /** Over photos where a light control reads better, and beside carousels on the page. */
        light: "border-border bg-background/90 text-foreground backdrop-blur-sm hover:bg-background focus-visible:border-foreground",
        /** On the full-screen photo viewer's dark backdrop. */
        clear: "border-background/25 bg-background/5 text-background backdrop-blur-sm hover:border-background/50 hover:bg-background/15 focus-visible:border-background",
      },
      size: {
        xs: "size-6 [&_svg]:size-3.5",
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-5",
        lg: "size-12 [&_svg]:size-5",
      },
      /** Show on hover where there is a mouse; always visible on touch screens and when focused. */
      reveal: {
        true: "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100",
        false: "",
      },
    },
    defaultVariants: { tone: "dark", size: "sm", reveal: false },
  }
);

type MediaButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> &
  VariantProps<typeof mediaButton> & {
    icon: IconType;
    /** Required: these buttons show only an icon. */
    "aria-label": string;
  };

/** Round icon button laid over media: carousel arrows, close and remove buttons. Callers place it. */
export default function MediaButton({ icon: Icon, tone, size, reveal, className, ...props }: MediaButtonProps) {
  return (
    <button type="button" className={cn(mediaButton({ tone, size, reveal }), className)} {...props}>
      <Icon aria-hidden="true" />
    </button>
  );
}
