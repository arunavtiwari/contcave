import React from "react";

import Skeleton from "@/components/ui/Skeleton";

interface ListingCardSkeletonProps {
    hideActions?: boolean;
}

const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({ hideActions }) => {
    return (
        <div className="relative bg-background border border-black/10 p-4 rounded-2xl flex flex-col gap-4">
            {/* Media Skeleton */}
            <Skeleton className="aspect-video w-full relative overflow-hidden rounded-xl bg-neutral-100" />

            {/* Info Section Skeleton */}
            <div className="flex flex-col gap-2 px-0.5">
                <Skeleton className="h-5 w-3/4 rounded-lg" />

                <div className="flex gap-2">
                    <Skeleton className="h-4 w-24 rounded-full" />
                </div>

                <Skeleton className="h-3 w-1/2 mt-1 rounded-md" />
            </div>

            {!hideActions && (
                <div className="flex gap-2 mt-auto pt-4 border-t border-neutral-100">
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                </div>
            )}
        </div>
    );
};

export default ListingCardSkeleton;
