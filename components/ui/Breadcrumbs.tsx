import { FiChevronRight } from "react-icons/fi";

import TextLink from "@/components/ui/TextLink";
import type { BreadcrumbItem } from "@/lib/seo";

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          return (
            <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <FiChevronRight size={14} aria-hidden="true" className="shrink-0" />}
              {item.href ? (
                <TextLink variant="muted" href={item.href}>{item.name}</TextLink>
              ) : (
                <span aria-current="page" className="truncate font-medium text-foreground">{item.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
