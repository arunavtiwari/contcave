import Skeleton from "@/components/ui/Skeleton";

export default function HomeLoading() {
    return (
        <div className="pt-24 px-4 sm:px-8 max-w-360 mx-auto">
            <Skeleton className="w-full h-64 sm:h-80 rounded-2xl" />

            <div className="flex gap-3 mt-8 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-10">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        <Skeleton className="aspect-square w-full rounded-xl" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}
