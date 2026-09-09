"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiDownload, FiEye, FiFilter, FiRefreshCw } from "react-icons/fi";

import type { AdminJobLogRow, AdminJobLogStats } from "@/app/actions/adminJobLogActions";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import Select, { type SelectOption } from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import {
  EmptyTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { downloadCustomCsv } from "@/lib/csv";
import { formatISTDateTime } from "@/lib/utils";

type Props = {
  logs: AdminJobLogRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: AdminJobLogStats;
  selectedJob: string;
  selectedStatus: string;
  availableJobs: string[];
};

const KNOWN_JOBS: SelectOption[] = [
  { value: "ALL", label: "All Schedules & Jobs" },
  { value: "post-booking-fast", label: "post-booking-fast (10m)" },
  { value: "post-booking-complete", label: "post-booking-complete (10m)" },
  { value: "payout-splits", label: "payout-splits (30m)" },
  { value: "booking-reminders", label: "booking-reminders (Daily 10 AM)" },
  { value: "invoice-retry", label: "invoice-retry (Hourly)" },
  { value: "month-end-invoices", label: "month-end-invoices (Monthly)" },
  { value: "pending-approval-expiry", label: "pending-approval-expiry" },
  { value: "extension-expiry", label: "extension-expiry" },
  { value: "additional-charge-expiry", label: "additional-charge-expiry" },
  { value: "auto-complete", label: "auto-complete" },
  { value: "booking-reminder", label: "booking-reminder (One-off)" },
  { value: "review-reminder", label: "review-reminder (One-off)" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "SUCCESS", label: "Success" },
  { value: "PARTIAL", label: "Partial" },
  { value: "FAILED", label: "Failed" },
];

function CompactPill({
  label,
  variant,
}: {
  label: React.ReactNode;
  variant: React.ComponentProps<typeof Pill>["variant"];
}) {
  return (
    <Pill
      label={<span className="whitespace-nowrap">{label}</span>}
      variant={variant}
      size="xs"
      className="tracking-normal"
    />
  );
}

function handleExportCsv(logs: AdminJobLogRow[]) {
  const headers = [
    "ID",
    "Job Name",
    "Status",
    "Items Processed",
    "Items Modified",
    "Summary",
    "Duration (ms)",
    "Executed At",
    "Error",
  ];
  const rows = logs.map((r) => [
    r.id,
    r.jobName,
    r.status,
    r.itemsProcessed,
    r.itemsModified,
    r.summary,
    r.durationMs,
    r.createdAt,
    r.error || "",
  ]);
  downloadCustomCsv("contcave-job-logs.csv", headers, rows);
}

export default function AdminJobLogsClient({
  logs,
  total,
  page,
  pageSize,
  stats,
  selectedJob,
  selectedStatus,
  availableJobs,
}: Props) {
  const router = useRouter();
  const [selectedLog, setSelectedLog] = useState<AdminJobLogRow | null>(null);

  const applyFilters = (job: string, status: string) => {
    const params = new URLSearchParams();
    if (job && job !== "ALL") params.set("jobName", job);
    if (status && status !== "ALL") params.set("status", status);
    params.set("page", "1");
    router.push(`/admin/dashboard/logs?${params.toString()}`);
  };

  const hrefForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    if (selectedJob && selectedJob !== "ALL") params.set("jobName", selectedJob);
    if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);
    params.set("page", String(targetPage));
    return `/admin/dashboard/logs?${params.toString()}`;
  };

  // Merge any distinct jobs from database into known jobs list
  const allJobOptions: SelectOption[] = [...KNOWN_JOBS];
  for (const job of availableJobs) {
    if (!allJobOptions.some((item) => item.value === job)) {
      allJobOptions.push({ value: job, label: job });
    }
  }

  const currentJobOption =
    allJobOptions.find((opt) => opt.value === selectedJob) || allJobOptions[0];
  const currentStatusOption =
    STATUS_OPTIONS.find((opt) => opt.value === selectedStatus) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Background Job Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tracks executions from all 6 Upstash QStash recurring maintenance schedules and one-off queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            label="Refresh"
            icon={FiRefreshCw}
            fit
            size="sm"
            outline
            onClick={() => router.refresh()}
          />
          <Button
            label="Export CSV"
            icon={FiDownload}
            fit
            size="sm"
            onClick={() => handleExportCsv(logs)}
            disabled={logs.length === 0}
          />
        </div>
      </div>

      {/* Aggregate Statistics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mutation Runs Logged"
          value={stats.totalRecorded}
          subtext="Runs modifying data or encountering errors"
        />
        <StatCard
          label="Total Items Modified"
          value={stats.totalModified}
          subtext="Bookings, charges, invoices, or reminders"
        />
        <StatCard
          label="Successful Executions"
          value={stats.successCount}
          subtext="Runs completed without failures"
        />
        <StatCard
          label="Issues / Failures"
          value={stats.failedCount + stats.partialCount}
          subtext={`${stats.failedCount} failed, ${stats.partialCount} partial`}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <FiFilter size={14} />
            <span>Filter:</span>
          </div>

          <div className="w-64">
            <Select
              options={allJobOptions}
              value={currentJobOption}
              onChange={(opt) =>
                applyFilters(
                  opt ? (opt as SelectOption).value : "ALL",
                  selectedStatus
                )
              }
              size="sm"
              isSearchable
              aria-label="Filter by schedule or job"
            />
          </div>

          <div className="w-44">
            <Select
              options={STATUS_OPTIONS}
              value={currentStatusOption}
              onChange={(opt) =>
                applyFilters(
                  selectedJob,
                  opt ? (opt as SelectOption).value : "ALL"
                )
              }
              size="sm"
              isSearchable={false}
              aria-label="Filter by execution status"
            />
          </div>

          {(selectedJob !== "ALL" || selectedStatus !== "ALL") && (
            <button
              onClick={() => applyFilters("ALL", "ALL")}
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{logs.length}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> recorded runs
        </div>
      </div>

      {/* Table Component */}
      {logs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <Table className="min-w-230 table-fixed" containerClassName="border-0 rounded-none">
            <colgroup>
              <col className="w-50" />
              <col className="w-27.5" />
              <col className="w-80" />
              <col className="w-25" />
              <col className="w-40" />
              <col className="w-20" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule / Job</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Summary of Changes</TableHead>
                <TableHead className="text-center">Modified</TableHead>
                <TableHead>Executed At</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((job) => {
                const isSuccess = job.status === "SUCCESS";
                const isFailed = job.status === "FAILED";
                const variant = isSuccess ? "success" : isFailed ? "destructive" : "warning";

                return (
                  <TableRow key={job.id} className="align-top">
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-foreground">{job.jobName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{job.durationMs}ms</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <CompactPill label={job.status} variant={variant} />
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">{job.summary}</div>
                      {job.error ? (
                        <div className="mt-1 truncate text-xs text-destructive" title={job.error}>
                          {job.error}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs font-medium text-foreground">
                        {job.itemsModified}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatISTDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        icon={FiEye}
                        isIconOnly
                        outline
                        aria-label="View job mutation details"
                        tooltip="View Details"
                        onClick={() => setSelectedLog(job)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <AdminTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            hrefForPage={hrefForPage}
          />
        </div>
      ) : (
        <EmptyTable label="No job logs recorded yet." />
      )}

      {/* Detail Inspection Modal */}
      {selectedLog ? (
        <Modal
          isOpen={Boolean(selectedLog)}
          onCloseAction={() => setSelectedLog(null)}
          onSubmitAction={() => setSelectedLog(null)}
          title={`Job Details: ${selectedLog.jobName}`}
          actionLabel="Close"
          customWidth="w-full max-w-2xl"
          body={
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>
                  <span className="font-medium text-muted-foreground">Job Name: </span>
                  <span className="font-mono font-semibold">{selectedLog.jobName}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Status: </span>
                  <span className="font-semibold">{selectedLog.status}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Modified Records: </span>
                  <span className="font-semibold">{selectedLog.itemsModified}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Duration: </span>
                  <span>{selectedLog.durationMs}ms</span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Summary: </span>
                  <span className="font-medium">{selectedLog.summary}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Executed At: </span>
                  <span>{formatISTDateTime(selectedLog.createdAt)}</span>
                </div>
              </div>

              {selectedLog.error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  <div className="font-semibold">Error Message:</div>
                  <div className="mt-1 font-mono">{selectedLog.error}</div>
                </div>
              ) : null}

              <div>
                <div className="mb-1 font-semibold text-foreground">Mutation & Change Details (JSON):</div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
