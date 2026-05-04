import Skeleton from "@/components/ui/Skeleton";

export default function PropertyEditLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-40" />
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-4 items-start">
                    <Skeleton className="h-5 w-32 shrink-0" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            ))}
        </div>
    );
}
