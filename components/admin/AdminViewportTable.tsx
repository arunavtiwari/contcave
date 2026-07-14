"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AdminViewportTableProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  minHeight?: number;
};

/** Keeps the header and pagination visible while only table rows scroll. */
export default function AdminViewportTable({
  children,
  footer,
  className,
  minHeight = 320,
}: AdminViewportTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      const container = containerRef.current;
      if (!container) return;

      const top = container.getBoundingClientRect().top;
      const main = container.closest("main");
      const bottomPadding = main ? Number.parseFloat(window.getComputedStyle(main).paddingBottom) || 24 : 24;
      const nextHeight = Math.max(minHeight, Math.floor(window.innerHeight - top - bottomPadding));
      setHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [minHeight]);

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-80 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm", className)}
      style={height ? { height } : undefined}
    >
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}
