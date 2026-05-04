import Skeleton from "@/components/ui/Skeleton";

export default function TransactionsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-40" />
            <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
