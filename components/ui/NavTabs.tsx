"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { type TabIcon, tabItemClass, tabListClass, TabPill } from "@/components/ui/TabPill";
import { cn, isPlainClick } from "@/lib/utils";

export interface NavTabItem {
  id: string;
  label: string;
  count?: number;
  href: string;
  icon?: TabIcon;
}

export interface NavTabsProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  activeId: string;
  items: NavTabItem[];
  ariaLabel?: string;
  layoutId?: string;
  onSelect?: (id: string) => void;
}

/** Tabs that are links between pages (a <nav> with aria-current), styled like Tabs. */
export function NavTabs({ activeId, items, ariaLabel = "Navigation tabs", layoutId, className, onSelect, ...props }: NavTabsProps) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [optimisticActiveId, setOptimisticActiveId] = React.useState(activeId);
  const [prevActiveId, setPrevActiveId] = React.useState(activeId);
  const generatedId = React.useId();

  if (activeId !== prevActiveId) {
    setPrevActiveId(activeId);
    setOptimisticActiveId(activeId);
  }

  return (
    <nav className={cn(tabListClass, className)} aria-label={ariaLabel} {...props}>
      {items.map((item) => {
        const isActive = item.id === optimisticActiveId;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => {
              if (!isPlainClick(e)) return;
              e.preventDefault();
              setOptimisticActiveId(item.id);
              if (onSelect) onSelect(item.id);
              else startTransition(() => router.push(item.href));
            }}
            className={tabItemClass(isActive)}
          >
            <TabPill isActive={isActive} layoutId={layoutId ?? `nav-tabs-${generatedId}`} icon={item.icon} count={item.count}>
              {item.label}
            </TabPill>
          </Link>
        );
      })}
    </nav>
  );
}
