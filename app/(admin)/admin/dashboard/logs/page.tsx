import { redirect } from "next/navigation";

import { getAdminJobLogs } from "@/app/actions/adminJobLogActions";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminJobLogsClient from "@/components/admin/AdminJobLogsClient";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job Logs",
  description: "Background maintenance and QStash scheduled job logs",
};

export default async function AdminJobLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; jobName?: string; status?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");

  const { page, jobName = "ALL", status = "ALL" } = await searchParams;
  const currentPage = Number(page) || 1;

  const data = await getAdminJobLogs({
    page: currentPage,
    pageSize: 20,
    jobName,
    status,
  });

  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (currentPage > lastPage) {
    const params = new URLSearchParams();
    if (jobName && jobName !== "ALL") params.set("jobName", jobName);
    if (status && status !== "ALL") params.set("status", status);
    params.set("page", String(lastPage));
    redirect(`/admin/dashboard/logs?${params.toString()}`);
  }

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
