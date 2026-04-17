import React from "react";

import Skeleton from "@/components/ui/Skeleton";

const ListingCardSkeleton = () => {
    return (
        <div className="col-span-1 p-3  rounded-2xl border border-neutral-100/50">
            <div className="flex flex-col gap-2 w-full">
                {/* Image area skeleton */}
                <Skeleton className="aspect-square w-full relative overflow-hidden rounded-xl" />

                {/* Title and rating line */}
                <div className="flex justify-between items-center mt-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-8" />
                </div>

                {/* Category and location line */}
                <Skeleton className="h-4 w-1/2 mt-0.5" />

                {/* Price line */}
                <div className="flex items-center mt-2">
                    <Skeleton className="h-5 w-1/3" />
                </div>
            </div>
        </div>
    );
};

export default ListingCardSkeleton;
