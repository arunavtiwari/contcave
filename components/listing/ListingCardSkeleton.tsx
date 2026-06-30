import React from "react";

import Skeleton from "@/components/ui/Skeleton";

interface ListingCardSkeletonProps {
    hideActions?: boolean;
    showRating?: boolean;
    isReservation?: boolean;
    isHost?: boolean;
}

const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({
    hideActions,
    showRating = true,
    isReservation = false,
    isHost = false
}) => (
    <div className="flex flex-col w-full">
        <div className="relative mb-2 overflow-hidden rounded-xl aspect-4/3 bg-neutral-100 border border-foreground/5">
            <Skeleton className="w-full h-full rounded-none" />

            {isReservation && (
                <div className="absolute left-3 top-3 z-20">
                    <Skeleton className="h-6 w-20 rounded-full opacity-80" />
                </div>
            )}

            <div className="absolute bottom-3 right-3 z-20">
                <Skeleton className="h-7.5 w-16 rounded-full opacity-80" />
            </div>
        </div>

        <div className="px-0.5 pt-1 flex flex-col gap-0.5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 mt-1">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                </div>

                {showRating && (
                    <div className="shrink-0">
                        <Skeleton className="h-6 w-11 rounded-full opacity-70" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="shrink-0 mt-0.5">
                    <Skeleton className="h-3.5 w-16 rounded-md opacity-60" />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Skeleton className="h-5 w-14 rounded-full opacity-55" />
                    <Skeleton className="h-5 w-12 rounded-full opacity-55" />
                </div>
            </div>

            {!hideActions && (
                <div className="flex mt-3 pt-1 gap-2">
                    {isReservation && (
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    )}
                    <div className="flex gap-2 flex-1">
                        <Skeleton className="h-9 flex-1 rounded-xl" />
                        {(isReservation || !hideActions) && <Skeleton className="h-9 flex-1 rounded-xl" />}
                        {isReservation && isHost && <Skeleton className="h-9 flex-1 rounded-xl" />}
                    </div>
                </div>
            )}
        </div>
    </div>
);

export default ListingCardSkeleton;
