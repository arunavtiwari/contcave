"use client";

import * as Radix from "@radix-ui/react-dialog";
import { type ComponentPropsWithoutRef, type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

export const DialogTitle = Radix.Title;

type DialogProps = Omit<ComponentPropsWithoutRef<typeof Radix.Content>, "children"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  overlayClassName?: string;
  /** Keep the dialog open on outside clicks (forms, where a stray click would lose input). */
  modalOnly?: boolean;
};

/**
 * The base every dialog in the app is built on (Radix: focus trap and return, Escape, scroll lock,
 * stacking). It owns only the overlay and behaviour; callers style the panel and render a DialogTitle.
 */
export default function Dialog({
  open,
  onOpenChange,
  children,
  className,
  overlayClassName,
  modalOnly,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: DialogProps) {
  // Our dialogs open from state rather than a Radix Trigger, so remember what had focus and return to it.
  const returnFocus = useRef<HTMLElement | null>(null);
  const keepOpen = modalOnly ? (event: Event) => event.preventDefault() : undefined;
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <Radix.Portal>
        <Radix.Overlay
          className={cn(
            "fixed inset-0 z-100001 bg-foreground/60 backdrop-blur-[2px] data-[state=closed]:animate-menu-out data-[state=open]:animate-menu-in",
            overlayClassName
          )}
        />
        <Radix.Content
          aria-describedby={undefined}
          onPointerDownOutside={keepOpen}
          onInteractOutside={keepOpen}
          onOpenAutoFocus={(event) => {
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            onOpenAutoFocus?.(event);
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-100001 -translate-x-1/2 -translate-y-1/2 focus:outline-none data-[state=closed]:animate-menu-out data-[state=open]:animate-menu-in",
            className
          )}
          {...props}
        >
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
