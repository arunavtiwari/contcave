"use client";

import * as Radix from "@radix-ui/react-dropdown-menu";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiCheck } from "react-icons/fi";

import { MENU_OFFSET, menuSurface, type MenuSurfaceProps } from "@/components/ui/menuSurface";
import { cn } from "@/lib/utils";

/**
 * Accessible dropdown menu (Radix): arrow keys, type-ahead, Escape, outside click, focus return
 * and menu roles. Non-modal, so the page keeps scrolling while it's open.
 */
export function DropdownMenu(props: ComponentProps<typeof Radix.Root>) {
  return <Radix.Root modal={false} {...props} />;
}

export const DropdownMenuTrigger = Radix.Trigger;
export const DropdownMenuRadioGroup = Radix.RadioGroup;

type ContentProps = ComponentProps<typeof Radix.Content> & MenuSurfaceProps;

export function DropdownMenuContent({ className, surface, align = "end", sideOffset = MENU_OFFSET, ...props }: ContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content align={align} sideOffset={sideOffset} className={cn(menuSurface({ surface }), className)} {...props} />
    </Radix.Portal>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <Radix.Separator className={cn("mx-2 my-2 border-t border-neutral-300", className)} />;
}

const itemVariants = cva("flex w-full cursor-pointer items-center text-left outline-none transition", {
  variants: {
    size: {
      md: "gap-3 rounded-xl px-4 py-2.5 font-medium data-highlighted:bg-muted",
      sm: "gap-2.5 rounded-lg px-3 py-2 text-xs font-medium data-highlighted:bg-muted",
    },
    tone: {
      default: "text-foreground",
      destructive: "text-destructive data-highlighted:bg-destructive/10",
    },
  },
  defaultVariants: { size: "md", tone: "default" },
});

type ItemProps = VariantProps<typeof itemVariants> & {
  label: string;
  icon?: IconType;
  /** Navigates; the menu closes on its own. */
  href?: string;
  /** Runs an action; the menu closes on its own. */
  onSelect?: () => void;
};

export function DropdownMenuItem({ label, icon: Icon, href, onSelect, size, tone }: ItemProps) {
  const iconSize = size === "sm" ? 14 : 18;
  const content = (
    <>
      {Icon && (
        <span className="flex shrink-0 items-center justify-center">
          <Icon size={iconSize} aria-hidden="true" />
        </span>
      )}
      <span className="leading-5">{label}</span>
    </>
  );

  return (
    <Radix.Item asChild onSelect={onSelect} className={itemVariants({ size, tone })}>
      {href ? <Link href={href}>{content}</Link> : <button type="button">{content}</button>}
    </Radix.Item>
  );
}

type RadioItemProps = {
  value: string;
  label: string;
  hint?: ReactNode;
};

/** One choice in a DropdownMenuRadioGroup, with a check mark on the selected one. */
export function DropdownMenuRadioItem({ value, label, hint }: RadioItemProps) {
  return (
    <Radix.RadioItem
      value={value}
      className="group flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-left text-sm text-foreground outline-none transition data-highlighted:bg-muted"
    >
      <FiCheck size={15} aria-hidden="true" className="shrink-0 opacity-0 group-data-[state=checked]:opacity-100" />
      <span className="min-w-0 flex-1">
        <span className="block group-data-[state=checked]:font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </Radix.RadioItem>
  );
}
