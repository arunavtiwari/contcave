"use server";

import { Prisma } from "@prisma/client";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { isAdmin } from "@/lib/user/permissions";

export type AdminJobLogRow = {
  id: string;
  jobName: string;
  status: string;
  itemsProcessed: number;
  itemsModified: number;
  summary: string;
  details: unknown;
  error?: string | null;
  durationMs: number;
  createdAt: string;
};

export type AdminJobLogStats = {
  totalRecorded: number;
  totalModified: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
};

export type GetAdminJobLogsParams = {
  page?: number;
  pageSize?: number;
  jobName?: string;
  status?: string;
};

type JobLogOverview = {
  availableJobs: string[];
  stats: AdminJobLogStats;
};

/**
 * The filter dropdown and the four stat cards used to cost five separate queries, one of
 * which asked Prisma for `distinct` job names — which MongoDB answers by loading every log
 * row and de-duplicating in memory. A single grouped aggregation replaces all of them.
 */
async function getJobLogOverview(): Promise<JobLogOverview> {
  const result = (await prisma.maintenanceJobLog.aggregateRaw({
    pipeline: [
      {
        $facet: {
          jobNames: [{ $group: { _id: "$jobName" } }, { $sort: { _id: 1 } }],
          byStatus: [{ $group: { _id: "$status", total: { $sum: 1 } } }],
          totals: [
            {
              $group: {
                _id: null,
                totalRecorded: { $sum: 1 },
                totalModified: { $sum: "$itemsModified" },
              },
            },
          ],
        },
      },
    ] as unknown as Prisma.InputJsonValue[],
  })) as unknown as Array<{
    jobNames?: Array<{ _id?: unknown }>;
    byStatus?: Array<{ _id?: unknown; total?: number }>;
    totals?: Array<{ totalRecorded?: number; totalModified?: number }>;
  }>;

  const facet = result[0] || {};
  const statusCounts = new Map<string, number>();
  for (const row of facet.byStatus || []) {
    if (typeof row._id === "string") statusCounts.set(row._id, row.total ?? 0);
  }

  return {
    availableJobs: (facet.jobNames || [])
      .map((row) => row._id)
      .filter((name): name is string => typeof name === "string"),
    stats: {
      totalRecorded: facet.totals?.[0]?.totalRecorded ?? 0,
      totalModified: facet.totals?.[0]?.totalModified ?? 0,
      successCount: statusCounts.get("SUCCESS") ?? 0,
      partialCount: statusCounts.get("PARTIAL") ?? 0,
      failedCount: statusCounts.get("FAILED") ?? 0,
    },
  };
}

export async function getAdminJobLogs({
  page = 1,
  pageSize = 20,
  jobName,
  status,
}: GetAdminJobLogsParams = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * pageSize;

  const where: {
    jobName?: string;
    status?: string;
  } = {};

  if (jobName && jobName !== "ALL") {
    where.jobName = jobName;
  }
  if (status && status !== "ALL") {
    where.status = status;
  }

  const [total, logs, overview] = await Promise.all([
    prisma.maintenanceJobLog.count({ where }),
    prisma.maintenanceJobLog.findMany({
      where,
      select: {
        id: true,
        jobName: true,
        status: true,
        itemsProcessed: true,
        itemsModified: true,
        summary: true,
        details: true,
        error: true,
        durationMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    getJobLogOverview(),
  ]);

  const serializedLogs: AdminJobLogRow[] = logs.map((log) => ({
    id: log.id,
    jobName: log.jobName,
    status: log.status,
    itemsProcessed: log.itemsProcessed,
    itemsModified: log.itemsModified,
    summary: log.summary,
    details: log.details,
    error: log.error,
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
  }));

  return {
    logs: serializedLogs,
    total,
    page: safePage,
    pageSize,
    availableJobs: overview.availableJobs,
    stats: overview.stats,
  };
}
