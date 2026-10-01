import type { HTMLAttributes, ReactNode } from "react";
import type { IconType } from "react-icons";

import { cn } from "@/lib/utils";

type CalloutProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: string;
  icon?: IconType;
  action?: ReactNode;
};

export default function Callout({ title, icon: Icon, action, children, className, ...props }: CalloutProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm", className)} {...props}>
      {Icon && <Icon className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        {children && <div className="mt-1 text-muted-foreground">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
