"use server";

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

  const [total, logs, stats, successCount, partialCount, failedCount, distinctJobs] = await Promise.all([
    prisma.maintenanceJobLog.count({ where }),
    prisma.maintenanceJobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.maintenanceJobLog.aggregate({
      _sum: {
        itemsModified: true,
        durationMs: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.maintenanceJobLog.count({ where: { status: "SUCCESS" } }),
    prisma.maintenanceJobLog.count({ where: { status: "PARTIAL" } }),
    prisma.maintenanceJobLog.count({ where: { status: "FAILED" } }),
    prisma.maintenanceJobLog.findMany({
      select: { jobName: true },
      distinct: ["jobName"],
      orderBy: { jobName: "asc" },
    }),
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
    availableJobs: distinctJobs.map((j) => j.jobName),
    stats: {
      totalRecorded: stats._count._all,
      totalModified: stats._sum.itemsModified || 0,
      successCount,
      partialCount,
      failedCount,
    },
  };
}
