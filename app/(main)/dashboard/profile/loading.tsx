import Skeleton from "@/components/ui/Skeleton";

export default function ProfileLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-28" />
            <div className="flex items-center gap-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-4 items-start">
                    <Skeleton className="h-5 w-32 shrink-0" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            ))}
        </div>
    );
}
