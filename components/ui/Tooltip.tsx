"use client";

import * as Radix from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const DEFAULT_DELAY_MS = 150;

export type TooltipProps = {
  children: ReactNode;
  content?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
  disabled?: boolean;
};

/**
 * A short hint shown on hover and keyboard focus (Radix: positioning, collision handling,
 * Escape, and an aria-describedby link to the trigger). Renders the child alone when there is
 * no content or the tooltip is disabled.
 */
export default function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 6,
  delayDuration = DEFAULT_DELAY_MS,
  className,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) return <>{children}</>;

  return (
    <Radix.Provider delayDuration={delayDuration}>
      <Radix.Root>
        <Radix.Trigger asChild>{children}</Radix.Trigger>
        <Radix.Portal>
          <Radix.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={8}
            className={cn(
              "z-100003 select-none rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-50 data-[state=closed]:animate-menu-out data-[state=delayed-open]:animate-menu-in data-[state=instant-open]:animate-menu-in",
              className
            )}
          >
            {content}
          </Radix.Content>
        </Radix.Portal>
      </Radix.Root>
    </Radix.Provider>
  );
}
