import React from "react";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4", className)}>
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      {subtext ? <div className="mt-0.5 text-[11px] text-muted-foreground">{subtext}</div> : null}
    </div>
  );
}
