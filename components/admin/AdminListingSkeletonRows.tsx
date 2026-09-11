import React from "react";

import Skeleton from "@/components/ui/Skeleton";
import { StatCardSkeleton } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/Table";

export function AdminListingSkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <TableRow key={idx} className="hover:bg-transparent select-none">
          <TableCell>
            <div className="flex min-w-72 items-center gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="min-w-48 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-md" />
              <Skeleton className="h-4.5 w-20 rounded-full" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16 rounded-md" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 rounded-md" />
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function CuratedListingSkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <TableRow key={idx} className="hover:bg-transparent select-none">
          <TableCell>
            <Skeleton className="h-4 w-40 rounded-md" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28 rounded-md" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-10 rounded-md" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24 rounded-full" />
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="h-4 w-14 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function AdminListingsTableSkeleton({ count = 10 }: { count?: number }) {
  return (
    <Table
      footer={
        <TablePagination
          page={1}
          pageSize={count}
          total={0}
          label="listings"
          className="opacity-50 pointer-events-none"
        />
      }
    >
      <TableHeader>
        <TableRow>
          <TableHead>Listing</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <AdminListingSkeletonRows count={count} />
      </TableBody>
    </Table>
  );
}

export function AdminListingsPageSkeleton() {
  return (
    <div className="w-full space-y-6" aria-label="Loading listings">
      {/* View Mode Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCardSkeleton hasIcon />
        <StatCardSkeleton hasIcon />
        <StatCardSkeleton hasIcon />
        <StatCardSkeleton hasIcon />
      </div>

      {/* Status Filter Tabs */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Encapsulated Component-Level Table Skeleton */}
      <AdminListingsTableSkeleton count={10} />
    </div>
  );
}

