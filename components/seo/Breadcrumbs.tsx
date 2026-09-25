import Link from "next/link";
import { FiChevronRight, FiHome } from "react-icons/fi";

import type { BreadcrumbItem } from "@/lib/seo";

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const visible = items.length > 2 ? items.slice(0, -1) : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className="-mx-1 overflow-x-auto px-1 text-xs text-muted-foreground [scrollbar-width:none] sm:text-sm [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex min-w-0 items-center gap-1 whitespace-nowrap">
        {visible.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === visible.length - 1;
          const isCurrent = isLast && visible.length === items.length;
          const label = isFirst ? (
            <>
              <FiHome className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{item.name}</span>
            </>
          ) : (
            item.name
          );

          return (
            <li key={`${item.name}-${index}`} className={`flex items-center gap-1 ${isCurrent ? "min-w-0" : "shrink-0"}`}>
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className="block max-w-[16rem] truncate font-medium text-foreground sm:max-w-md"
                  title={item.name}
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-md px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                  {label}
                </Link>
              )}
              {!isLast && <FiChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
