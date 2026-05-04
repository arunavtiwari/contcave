import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 w-full py-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
