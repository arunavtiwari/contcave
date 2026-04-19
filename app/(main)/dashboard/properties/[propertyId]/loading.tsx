import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
    return (
    return (
        <div className="flex flex-col w-full gap-5 sm:gap-8">
            {/* Heading */}
            <Skeleton className="h-9 w-48 rounded-lg" />

            {/* Name */}
            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-16 sm:w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Custom URL */}
            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-24 sm:w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Description */}
            <div className="flex sm:items-start gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-24 sm:w-1/3" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>

            {/* Terms & Conditions by Host */}
            <div className="flex sm:items-start gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-48 sm:w-1/3" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>

            {/* Category */}
            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-20 sm:w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Listed Services */}
            <div className="flex sm:items-start gap-1 sm:gap-10 flex-col sm:flex-row">
                <div className="sm:w-1/3 space-y-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-full" />
                    ))}
                </div>
            </div>

            {/* Price */}
            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-14 sm:w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Location */}
            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-20 sm:w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Images */}
            <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-32 sm:w-1/3" />
                <div className="w-full grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-xl" />
                    ))}
                </div>
            </div>

            {/* Amenities */}
            <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                <Skeleton className="h-5 w-24 sm:w-1/3" />
                <div className="grid grid-cols-3 gap-3 w-full">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-8 rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-5">
                <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
        </div>
    );
}
