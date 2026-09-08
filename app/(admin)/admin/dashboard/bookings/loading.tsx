import Skeleton from "@/components/ui/Skeleton";

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <Skeleton className="h-7 w-10" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr>
      <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-3 py-3"><Skeleton className="h-4 w-40" /></td>
      <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-3 py-3"><Skeleton className="mx-auto h-6 w-16 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-3 py-3"><Skeleton className="ml-auto h-4 w-16" /></td>
      <td className="px-3 py-3"><Skeleton className="mx-auto h-6 w-24 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="mx-auto h-6 w-24 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="mx-auto h-6 w-28 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="ml-auto h-9 w-9 rounded-lg" /></td>
    </tr>
  );
}

export default function AdminBookingsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading bookings operations">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-background p-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-xl" />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] table-fixed divide-y divide-border xl:min-w-full">
            <thead className="bg-muted/40">
              <tr>
                {["Booking", "Studio", "Customer", "Owner", "GST", "Date", "Amount", "Status", "Invoice", "Receipts & Refunds", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className={`px-3 py-3 ${["GST", "Status", "Invoice", "Receipts & Refunds"].includes(heading) ? "text-center" : heading === "Amount" || heading === "Actions" ? "text-right" : "text-left"}`}
                  >
                    <Skeleton className={`h-3 w-16 ${["GST", "Status", "Invoice", "Receipts & Refunds"].includes(heading) ? "mx-auto" : heading === "Amount" || heading === "Actions" ? "ml-auto" : ""}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, index) => (
                <RowSkeleton key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
