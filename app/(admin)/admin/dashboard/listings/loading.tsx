import Skeleton from "@/components/ui/Skeleton";

export default function AdminListingsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full p-6">
            <Skeleton className="h-8 w-40" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
