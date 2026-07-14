import Link from "next/link";
import type { ReactNode } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const pageControlClass = "flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30";

function PageControl({
  disabled,
  href,
  label,
  children,
}: {
  disabled: boolean;
  href: string;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        title={`${label} unavailable`}
        className={`${pageControlClass} cursor-not-allowed bg-muted/60 text-muted-foreground shadow-none`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`${pageControlClass} hover:border-foreground/30 hover:bg-foreground hover:text-background`}
    >
      {children}
    </Link>
  );
}

type AdminTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
};

export default function AdminTablePagination({
  page,
  pageSize,
  total,
  hrefForPage,
}: AdminTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  return (
    <footer className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/95 px-5 shadow-[0_-1px_0_rgba(0,0,0,0.04)] backdrop-blur">
      <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
        Showing {first}-{last} of {total}
      </p>
      <nav className="flex items-center gap-2" aria-label="Table pagination">
        <PageControl
          href={hrefForPage(Math.max(1, currentPage - 1))}
          label="Previous page"
          disabled={currentPage === 1}
        >
          <FiChevronLeft size={18} />
        </PageControl>
        <span className="min-w-20 text-center text-xs font-semibold tabular-nums text-foreground">
          Page {currentPage} of {pageCount}
        </span>
        <PageControl
          href={hrefForPage(Math.min(pageCount, currentPage + 1))}
          label="Next page"
          disabled={currentPage === pageCount}
        >
          <FiChevronRight size={18} />
        </PageControl>
      </nav>
    </footer>
  );
}
