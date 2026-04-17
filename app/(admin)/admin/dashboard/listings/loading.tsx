import TableSkeleton from "@/components/admin/TableSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="w-full flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-72 mt-1" />
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background rounded-xl border border-border p-5 flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                    <div>
                        <Skeleton className="h-7 w-8 mb-1" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <TableSkeleton />
        </div>
    );
}
