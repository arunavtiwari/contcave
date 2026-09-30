"use client";

import type { ReactNode } from "react";

import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { cn } from "@/lib/utils";

export default function PendingFeed({ children }: { children: ReactNode }) {
  const { isPending } = useFilterNavigation();

  return (
    <div
      aria-busy={isPending}
      className={cn("transition-opacity duration-200", isPending && "pointer-events-none opacity-50")}
    >
      {children}
    </div>
  );
}
