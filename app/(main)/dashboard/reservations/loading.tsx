import Skeleton from "@/components/ui/Skeleton";

export default function ReservationsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-44" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
