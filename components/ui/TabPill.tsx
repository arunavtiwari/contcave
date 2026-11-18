"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type TabIcon = ComponentType<{ className?: string; size?: number }>;

export const tabListClass = "inline-flex w-fit max-w-full overflow-x-auto [scrollbar-width:none] flex-nowrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 select-none";

export const tabItemClass = (isActive: boolean) =>
  cn(
    "relative inline-flex min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:border-foreground disabled:pointer-events-none disabled:opacity-50 active:transform-none!",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
  );

/** The inside of one tab: the sliding active pill, then icon, label and count. Shared by Tabs and NavTabs. */
export function TabPill({
  isActive,
  layoutId,
  icon: Icon,
  count,
  children,
}: {
  isActive: boolean;
  layoutId: string;
  icon?: TabIcon;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-lg border border-border/80 bg-background"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {Icon && <Icon size={14} className="shrink-0" />}
        <span>{children}</span>
        {typeof count === "number" && (
          <span
            className={cn(
              "rounded-full px-1.5 text-[10px] font-medium tabular-nums transition-colors",
              isActive ? "bg-muted text-foreground" : "bg-background/80 text-muted-foreground"
            )}
          >
            {count}
          </span>
        )}
      </span>
    </>
  );
}
