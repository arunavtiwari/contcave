import { redirect } from "next/navigation";
import React, { Suspense } from "react";

import { getAdminJobLogs } from "@/app/actions/adminJobLogActions";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminJobLogsClient from "@/components/admin/AdminJobLogsClient";
import Skeleton from "@/components/ui/Skeleton";
import { StatCardSkeleton } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job Logs",
  description: "Background maintenance and QStash scheduled job logs",
};

function JobLogsSkeleton() {
  return (
    <div className="w-full space-y-6" aria-label="Loading job logs">
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      <Table
        footer={
          <TablePagination
            page={1}
            pageSize={10}
            total={0}
            label="logs"
            className="opacity-50 pointer-events-none"
          />
        }
      >
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Job Name</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Executed At</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableSkeletonRows rows={10} columns={7} />
        </TableBody>
      </Table>
    </div>
  );
}

async function JobLogsData({
  page,
  pageSize,
  jobName,
  status,
}: {
  page: number;
  pageSize: number;
  jobName: string;
  status: string;
}) {
  const data = await getAdminJobLogs({
    page,
    pageSize,
    jobName,
    status,
  });

  return (
    <AdminJobLogsClient
      logs={data.logs}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      stats={data.stats}
      selectedJob={jobName}
      selectedStatus={status}
      availableJobs={data.availableJobs}
    />
  );
}

export default async function AdminJobLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; jobName?: string; status?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");

  const { page, pageSize, jobName = "ALL", status = "ALL" } = await searchParams;
  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;

  return (
    <Suspense fallback={<JobLogsSkeleton />}>
      <JobLogsData
        page={currentPage}
        pageSize={currentPageSize}
        jobName={jobName}
        status={status}
      />
    </Suspense>
  );
}
