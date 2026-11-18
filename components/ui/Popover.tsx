"use client";

import * as Radix from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import { MENU_OFFSET, menuSurface, type MenuSurfaceProps } from "@/components/ui/menuSurface";
import { cn } from "@/lib/utils";

/** Accessible popover (Radix) for panels of content rather than a list of actions. */
export const Popover = Radix.Root;
export const PopoverTrigger = Radix.Trigger;
export const PopoverAnchor = Radix.Anchor;

type ContentProps = ComponentProps<typeof Radix.Content> & MenuSurfaceProps;

export function PopoverContent({ className, surface, align = "end", sideOffset = MENU_OFFSET, ...props }: ContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content align={align} sideOffset={sideOffset} className={cn(menuSurface({ surface }), className)} {...props} />
    </Radix.Portal>
  );
}
