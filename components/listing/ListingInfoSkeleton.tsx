import Skeleton from "@/components/ui/Skeleton";

export default function ListingInfoSkeleton() {
    return (
        <div className="flex flex-col gap-8 md:col-span-4">
            <div className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </div>
            <hr className="border-neutral-100" />
            <div className="space-y-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
            </div>
            <hr className="border-neutral-100" />
            <div className="space-y-4">
                <Skeleton className="h-8 w-40" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}
