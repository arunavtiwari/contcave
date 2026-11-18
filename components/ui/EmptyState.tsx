import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiSearch } from "react-icons/fi";

import Heading from "@/components/ui/Heading";

type EmptyStateProps = {
  title?: string;
  subtitle?: string;
  icon?: IconType;
  /** Optional next step, such as a button. */
  action?: ReactNode;
};

/** Centred message for an empty list or an unavailable page section. */
export default function EmptyState({
  title = "Nothing here yet",
  subtitle,
  icon: Icon = FiSearch,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-[60vh] animate-menu-in flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-border bg-background">
        <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
      </div>
      <Heading center title={title} subtitle={subtitle} variant="h3" />
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
