import Link from "next/link";

import { cn } from "@/lib/utils";

type AdminTabItem = {
  id: string;
  label: string;
  count?: number;
  href: string;
};

type AdminTabsProps = {
  activeId: string;
  ariaLabel: string;
  items: AdminTabItem[];
};

export default function AdminTabs({ activeId, ariaLabel, items }: AdminTabsProps) {
  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-background p-2" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
              active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", active ? "bg-background/20" : "bg-muted text-foreground")}>
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
