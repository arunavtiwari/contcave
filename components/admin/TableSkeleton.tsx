import Skeleton from "@/components/ui/Skeleton";

function MetricCardSkeleton() {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    );
}

function TableRowSkeleton() {
    return (
        <tr>
            <td className="px-5 py-4">
                <div className="flex min-w-72 items-center gap-3">
                    <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                    <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-36" />
                    </div>
                </div>
            </td>
            <td className="px-5 py-4">
                <div className="min-w-52 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </td>
            <td className="px-5 py-4">
                <Skeleton className="h-6 w-20 rounded-full" />
            </td>
            <td className="px-5 py-4">
                <Skeleton className="h-4 w-16" />
            </td>
            <td className="px-5 py-4">
                <Skeleton className="h-4 w-24" />
            </td>
            <td className="px-5 py-4 text-right">
                <Skeleton className="ml-auto h-9 w-9 rounded-xl" />
            </td>
        </tr>
    );
}

export default function TableSkeleton() {
    return (
        <div className="w-full space-y-6" aria-label="Loading admin listing review dashboard">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <MetricCardSkeleton key={index} />
                ))}
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-background p-2">
                <Skeleton className="h-9 w-16 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/70">
                            <tr>
                                {["Listing", "Host", "Status", "Price", "Submitted", "Actions"].map((heading) => (
                                    <th
                                        key={heading}
                                        scope="col"
                                        className={`px-5 py-3 text-left ${heading === "Actions" ? "text-right" : ""}`}
                                    >
                                        <Skeleton className={`h-3 ${heading === "Actions" ? "ml-auto w-14" : "w-16"}`} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <TableRowSkeleton key={index} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
