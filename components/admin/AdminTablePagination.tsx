import { TablePagination } from "@/components/ui/Table";

export type AdminTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
  className?: string;
  label?: string;
};

export default function AdminTablePagination({
  page,
  pageSize,
  total,
  hrefForPage,
  className,
  label = "entries",
}: AdminTablePaginationProps) {
  return (
    <TablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      hrefForPage={hrefForPage}
      className={className}
      label={label}
    />
  );
}
