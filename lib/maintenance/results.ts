type MaintenanceResult = {
  status?: string;
  ok?: boolean;
};

export function assertNoFailedMaintenanceResults(results: readonly MaintenanceResult[]): void {
  const hasFailure = results.some((result) =>
    result.ok === false || result.status?.toLowerCase() === "failed"
  );

  if (hasFailure) {
    throw new Error("One or more scheduled maintenance items failed; the scheduler should retry the delivery");
  }
}
