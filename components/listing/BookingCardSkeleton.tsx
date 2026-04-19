import React from "react";

import Skeleton from "@/components/ui/Skeleton";

const BookingCardSkeleton = () => {
    return (
        <div className="relative bg-background border border-black/10 p-4 rounded-2xl flex flex-col gap-4">
            {/* Media Skeleton */}
            <div className="aspect-video w-full relative overflow-hidden rounded-xl bg-neutral-100 border border-black/5">
                <Skeleton className="w-full h-full" />

                {/* Status Pill Placeholder */}
                <div className="absolute top-3 right-3 z-20">
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                {/* Price Pill Placeholder */}
                <div className="absolute bottom-3 right-3 z-20">
                    <Skeleton className="h-7 w-20 rounded-full" />
                </div>
            </div>

            {/* Info Section Skeleton */}
            <div className="flex flex-col gap-1.5 px-0.5">
                <Skeleton className="h-5 w-3/4 rounded-lg" />

                <div className="flex gap-2">
                    <Skeleton className="h-4 w-24 rounded-full" />
                </div>

                <Skeleton className="h-3 w-1/2 mt-1 rounded-md" />
            </div>

            {/* Action Toolbar Skeleton */}
            <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-neutral-100">
                <div className="flex gap-2">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                </div>
            </div>
        </div>
    );
};

export default BookingCardSkeleton;
