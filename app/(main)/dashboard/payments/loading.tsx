import Skeleton from "@/components/ui/Skeleton";

export default function PaymentsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-36" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
