import Skeleton from "@/components/ui/Skeleton";

export default function ListingReservationSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm w-full flex flex-col gap-6 sticky top-24">
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
            </div>
            <hr className="border-neutral-100" />
            <div className="flex flex-col gap-4">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-12 w-full bg-neutral-800 opacity-50 xl:px-4 rounded-full mt-4" />
        </div>
    );
}
