import React from "react";
import type { IconType } from "react-icons";

import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value?: number | string | null;
  subtext?: string;
  icon?: IconType | React.ComponentType<{ className?: string; size?: number }>;
  isLoading?: boolean;
  className?: string;
}

export function StatCardSkeleton({
  hasIcon = false,
  className,
}: {
  hasIcon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border border-border bg-white p-4 select-none", className)}>
      {hasIcon && <Skeleton className="size-11 shrink-0 rounded-xl" />}
      <div className="min-w-0 space-y-1.5 flex-1">
        <Skeleton className="h-6 w-12 rounded-md" />
        <Skeleton className="h-3.5 w-20 rounded-md" />
      </div>
    </div>
  );
}

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  isLoading = false,
  className,
}: StatCardProps) {
  const isCardLoading = isLoading || value === undefined || value === null;

  if (isCardLoading) {
    return (
      <div className={cn("flex items-center gap-4 rounded-xl border border-border bg-white p-4 select-none", className)}>
        {Icon ? <Skeleton className="size-11 shrink-0 rounded-xl" /> : null}
        <div className="min-w-0 space-y-1.5 flex-1">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-3.5 w-20 rounded-md" />
          {subtext ? <Skeleton className="h-2.5 w-28 rounded-md" /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 rounded-xl border border-border bg-white p-4", className)}>
      {Icon ? (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-foreground">
          <Icon size={19} />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {subtext ? <div className="mt-1 text-[11px] text-muted-foreground">{subtext}</div> : null}
      </div>
    </div>
  );
}
