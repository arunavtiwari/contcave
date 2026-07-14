import Link from "next/link";

type DashboardPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  hrefForPage: (page: number) => string;
  itemLabel: string;
};

export default function DashboardPagination({
  page,
  totalPages,
  total,
  hrefForPage,
  itemLabel,
}: DashboardPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4" aria-label={`${itemLabel} pages`}>
      <span className="text-sm text-muted-foreground">{total} {itemLabel}</span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className="rounded-full border border-border px-4 py-2 text-sm" href={hrefForPage(page - 1)}>
            Previous
          </Link>
        ) : null}
        <span className="text-sm">Page {page} of {totalPages}</span>
        {page < totalPages ? (
          <Link className="rounded-full border border-border px-4 py-2 text-sm" href={hrefForPage(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
