"use client";

import { useEffect, useState, useTransition } from "react";
import { FiDownload, FiEye, FiFilter, FiRefreshCw } from "react-icons/fi";

import { type AdminJobLogRow, type AdminJobLogStats, getAdminJobLogs } from "@/app/actions/adminJobLogActions";
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
  TablePagination,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
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
  const [logsData, setLogsData] = useState({
    logs,
    total,
    page,
    pageSize,
    stats,
    selectedJob,
    selectedStatus,
    availableJobs,
  });

  const [prevProps, setPrevProps] = useState({
    logs,
    total,
    page,
    pageSize,
    selectedJob,
    selectedStatus,
  });

  if (
    logs !== prevProps.logs ||
    total !== prevProps.total ||
    page !== prevProps.page ||
    pageSize !== prevProps.pageSize ||
    selectedJob !== prevProps.selectedJob ||
    selectedStatus !== prevProps.selectedStatus
  ) {
    setPrevProps({
      logs,
      total,
      page,
      pageSize,
      selectedJob,
      selectedStatus,
    });
    setLogsData({
      logs,
      total,
      page,
      pageSize,
      stats,
      selectedJob,
      selectedStatus,
      availableJobs,
    });
  }

  const [optimisticJob, setOptimisticJob] = useState(selectedJob);
  const [prevJob, setPrevJob] = useState(selectedJob);
  if (selectedJob !== prevJob) {
    setPrevJob(selectedJob);
    setOptimisticJob(selectedJob);
  }

  const [optimisticStatus, setOptimisticStatus] = useState(selectedStatus);
  const [prevStatus, setPrevStatus] = useState(selectedStatus);
  if (selectedStatus !== prevStatus) {
    setPrevStatus(selectedStatus);
    setOptimisticStatus(selectedStatus);
  }

  const [isNavigating, startNavTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AdminJobLogRow | null>(null);

  const navigateLogs = (
    nextJob = optimisticJob,
    nextStatus = optimisticStatus,
    nextPage = 1,
    nextPageSize = logsData.pageSize
  ) => {
    setOptimisticJob(nextJob);
    setOptimisticStatus(nextStatus);
    const search = new URLSearchParams();
    if (nextJob && nextJob !== "ALL") search.set("jobName", nextJob);
    if (nextStatus && nextStatus !== "ALL") search.set("status", nextStatus);
    search.set("page", String(nextPage));
    search.set("pageSize", String(nextPageSize));

    window.history.pushState(null, "", `/admin/dashboard/logs?${search.toString()}`);

    startNavTransition(async () => {
      try {
        const res = await getAdminJobLogs({
          page: nextPage,
          pageSize: nextPageSize,
          jobName: nextJob,
          status: nextStatus,
        });
        setLogsData({
          logs: res.logs,
          total: res.total,
          page: res.page,
          pageSize: res.pageSize,
          stats: res.stats,
          selectedJob: nextJob,
          selectedStatus: nextStatus,
          availableJobs: res.availableJobs,
        });
      } catch {
        toast.error("Failed to load job logs");
      }
    });
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const job = params.get("jobName") || "ALL";
      const status = params.get("status") || "ALL";
      const p = Number(params.get("page")) || 1;
      const ps = Number(params.get("pageSize")) || logsData.pageSize;
      setOptimisticJob(job);
      setOptimisticStatus(status);
      startNavTransition(async () => {
        try {
          const res = await getAdminJobLogs({
            page: p,
            pageSize: ps,
            jobName: job,
            status,
          });
          setLogsData({
            logs: res.logs,
            total: res.total,
            page: res.page,
            pageSize: res.pageSize,
            stats: res.stats,
            selectedJob: job,
            selectedStatus: status,
            availableJobs: res.availableJobs,
          });
        } catch {
          toast.error("Failed to load job logs");
        }
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [logsData.pageSize]);

  const applyFilters = (job: string, status: string) => {
    navigateLogs(job, status, 1, logsData.pageSize);
  };

  const hrefForPage = (targetPage: number, targetSize?: number) => {
    const params = new URLSearchParams();
    if (optimisticJob && optimisticJob !== "ALL") params.set("jobName", optimisticJob);
    if (optimisticStatus && optimisticStatus !== "ALL") params.set("status", optimisticStatus);
    params.set("page", String(targetPage));
    params.set("pageSize", String(targetSize || logsData.pageSize));
    return `/admin/dashboard/logs?${params.toString()}`;
  };

  // Merge any distinct jobs from database into known jobs list
  const allJobOptions: SelectOption[] = [...KNOWN_JOBS];
  for (const job of logsData.availableJobs) {
    if (!allJobOptions.some((item) => item.value === job)) {
      allJobOptions.push({ value: job, label: job });
    }
  }

  const currentJobOption =
    allJobOptions.find((opt) => opt.value === optimisticJob) || allJobOptions[0];
  const currentStatusOption =
    STATUS_OPTIONS.find((opt) => opt.value === optimisticStatus) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          label="Refresh"
          icon={FiRefreshCw}
          fit
          size="sm"
          outline
          onClick={() => navigateLogs(optimisticJob, optimisticStatus, logsData.page, logsData.pageSize)}
        />
        <Button
          label="Export CSV"
          icon={FiDownload}
          fit
          size="sm"
          onClick={() => handleExportCsv(logsData.logs)}
          disabled={logsData.logs.length === 0 || isNavigating}
        />
      </div>

      {/* Aggregate Statistics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mutation Runs Logged"
          value={logsData.stats.totalRecorded}
          subtext="Runs modifying data or encountering errors"
        />
        <StatCard
          label="Total Items Modified"
          value={logsData.stats.totalModified}
          subtext="Bookings, charges, invoices, or reminders"
        />
        <StatCard
          label="Successful Executions"
          value={logsData.stats.successCount}
          subtext="Runs completed without failures"
        />
        <StatCard
          label="Issues / Failures"
          value={logsData.stats.failedCount + logsData.stats.partialCount}
          subtext={`${logsData.stats.failedCount} failed, ${logsData.stats.partialCount} partial`}
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
                  optimisticStatus
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
                  optimisticJob,
                  opt ? (opt as SelectOption).value : "ALL"
                )
              }
              size="sm"
              isSearchable={false}
              aria-label="Filter by execution status"
            />
          </div>

          {(optimisticJob !== "ALL" || optimisticStatus !== "ALL") && (
            <button
              onClick={() => applyFilters("ALL", "ALL")}
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{logsData.logs.length}</span> of{" "}
          <span className="font-semibold text-foreground">{logsData.total}</span> recorded runs
        </div>
      </div>

      {/* Table Component */}
      {logsData.logs.length > 0 || isNavigating ? (
        <Table
          className="min-w-230 table-fixed"
          footer={
            <TablePagination
              page={logsData.page}
              pageSize={logsData.pageSize}
              total={logsData.total}
              pageSizeOptions={[10, 20, 50]}
              hrefForPage={hrefForPage}
              onPageChange={(page) => navigateLogs(optimisticJob, optimisticStatus, page, logsData.pageSize)}
              onPageSizeChange={(newSize) => navigateLogs(optimisticJob, optimisticStatus, 1, newSize)}
              label="logs"
            />
          }
        >
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
            {isNavigating ? (
              <TableSkeletonRows rows={Math.min(logsData.pageSize, 10)} columns={6} />
            ) : (
              logsData.logs.map((job) => {
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
              })
            )}
          </TableBody>
        </Table>
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
