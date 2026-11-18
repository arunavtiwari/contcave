"use client";

import type { ComponentProps } from "react";

import Dialog, { DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

export const SheetTitle = DialogTitle;

/** A phone panel that rises from the bottom, built on the shared Dialog. */
export default function Sheet({ className, overlayClassName, ...props }: ComponentProps<typeof Dialog>) {
  return (
    <Dialog
      overlayClassName={cn("bg-foreground/40 backdrop-blur-none", overlayClassName)}
      className={cn(
        "inset-x-0 bottom-0 left-0 top-16 flex translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-[22px] bg-background",
        className
      )}
      {...props}
    />
  );
}
