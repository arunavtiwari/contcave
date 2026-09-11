"use client";

import Link from "next/link";
import * as React from "react";
import { FiChevronLeft, FiChevronRight, FiInbox } from "react-icons/fi";
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from "react-icons/lu";

import Select, { type SelectOption } from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface TableShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}

const TableShell = React.forwardRef<HTMLDivElement, TableShellProps>(
  ({ header, footer, children, className, containerClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-border bg-white text-foreground transition-colors",
          containerClassName,
          className
        )}
        {...props}
      >
        {header && (
          <div className="border-b border-border bg-muted/20 px-4 py-3">
            {header}
          </div>
        )}
        <div className="w-full overflow-x-auto">
          {children}
        </div>
        {footer && (
          <div className="border-t border-border bg-white">
            {footer}
          </div>
        )}
      </div>
    );
  }
);
TableShell.displayName = "TableShell";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  footer?: React.ReactNode;
  containerClassName?: string;
  isStandalone?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, footer, containerClassName, isStandalone = false, ...props }, ref) => {
    const tableElement = (
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    );

    if (isStandalone) {
      return tableElement;
    }

    return (
      <TableShell footer={footer} containerClassName={containerClassName}>
        {tableElement}
      </TableShell>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "border-b border-border bg-muted/35 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-border/60 bg-background", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-border bg-muted/30 font-medium text-foreground text-xs [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/50 transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted last:border-b-0",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export type SortDirection = "asc" | "desc" | false | null;

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: (direction: "asc" | "desc") => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable = false, sortDirection = false, onSort, onClick, ...props }, ref) => {
    const handleSortClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
      onClick?.(e);
      if (sortable && onSort) {
        onSort(sortDirection === "asc" ? "desc" : "asc");
      }
    };

    return (
      <th
        ref={ref}
        aria-sort={
          sortDirection === "asc"
            ? "ascending"
            : sortDirection === "desc"
            ? "descending"
            : undefined
        }
        onClick={handleSortClick}
        className={cn(
          "h-10 px-4 py-3 text-left align-middle font-semibold text-xs text-muted-foreground select-none",
          sortable && "cursor-pointer hover:text-foreground transition-colors group",
          className
        )}
        {...props}
      >
        {sortable ? (
          <div className="inline-flex items-center gap-1.5">
            <span>{children}</span>
            <span className="inline-flex shrink-0">
              {sortDirection === "asc" ? (
                <LuArrowUp className="size-3.5 text-foreground" />
              ) : sortDirection === "desc" ? (
                <LuArrowDown className="size-3.5 text-foreground" />
              ) : (
                <LuArrowUpDown className="size-3.5 text-muted-foreground/50 transition-opacity group-hover:text-foreground group-hover:opacity-100" />
              )}
            </span>
          </div>
        ) : (
          children
        )}
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3.5 align-middle text-xs md:text-sm text-foreground", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export interface TableSkeletonRowsProps {
  rows?: number;
  columns?: number;
  cellWidths?: string[];
  className?: string;
}

export function TableSkeletonRows({
  rows = 5,
  columns = 5,
  cellWidths,
  className,
}: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className={cn("hover:bg-transparent", className)}>
          {Array.from({ length: columns }).map((_, colIndex) => {
            const defaultWidth = colIndex === 0 ? "w-4/5" : colIndex === columns - 1 ? "w-1/2 ml-auto" : "w-2/3";
            const width = cellWidths?.[colIndex] || defaultWidth;
            return (
              <TableCell key={colIndex} className={colIndex === columns - 1 ? "text-right" : ""}>
                <Skeleton className={cn("h-4 rounded-md", width)} />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  hrefForPage?: (page: number, pageSize?: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
  label?: string;
}

function TablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageSizeChange,
  hrefForPage,
  onPageChange,
  className,
  label = "items",
}: TablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(pageCount, currentPage + 1);

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= pageCount;

  const buttonBaseClass =
    "inline-flex items-center justify-center size-8 rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none active:scale-100! active:transform-none!";

  const renderButton = (
    _direction: "prev" | "next",
    targetPage: number,
    disabled: boolean,
    icon: React.ReactNode,
    text: string
  ) => {
    if (disabled) {
      return (
        <span
          aria-disabled="true"
          className={cn(buttonBaseClass, "cursor-not-allowed opacity-40 hover:bg-background")}
          aria-label={text}
        >
          {icon}
          <span className="sr-only">{text}</span>
        </span>
      );
    }

    if (hrefForPage) {
      return (
        <Link
          href={hrefForPage(targetPage, pageSize)}
          className={buttonBaseClass}
          aria-label={text}
          onClick={(e) => {
            if (onPageChange && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              onPageChange(targetPage);
            }
          }}
        >
          {icon}
          <span className="sr-only">{text}</span>
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onPageChange?.(targetPage)}
        className={buttonBaseClass}
        aria-label={text}
      >
        {icon}
        <span className="sr-only">{text}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground select-none",
        className
      )}
      aria-label="Table pagination"
    >
      <div className="font-normal">
        Showing <span className="font-medium text-foreground">{first}</span> to{" "}
        <span className="font-medium text-foreground">{last}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> {label}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-end sm:self-auto">
        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows:</span>
            <div className="w-17">
              <Select<SelectOption>
                size="xs"
                isSearchable={false}
                value={{ value: String(pageSize), label: String(pageSize) }}
                options={pageSizeOptions.map((opt) => ({
                  value: String(opt),
                  label: String(opt),
                }))}
                onChange={(option) => {
                  const selected = option as SelectOption | null;
                  if (selected) {
                    onPageSizeChange(Number(selected.value));
                  }
                }}
                menuPlacement="auto"
              />
            </div>
          </div>
        )}

        <span className="text-xs font-medium text-foreground tabular-nums">
          Page {currentPage} of {pageCount}
        </span>
        <div className="flex items-center gap-1.5">
          {renderButton("prev", prevPage, isPrevDisabled, <FiChevronLeft size={16} />, "Previous page")}
          {renderButton("next", nextPage, isNextDisabled, <FiChevronRight size={16} />, "Next page")}
        </div>
      </div>
    </div>
  );
}

function EmptyTable({
  label = "No records found.",
  description,
  icon: Icon = FiInbox,
  action,
  className,
}: {
  label?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-14 text-center text-muted-foreground",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-neutral-50 text-muted-foreground">
        <Icon size={20} />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-foreground">{label}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export {
  EmptyTable,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableShell,
};
