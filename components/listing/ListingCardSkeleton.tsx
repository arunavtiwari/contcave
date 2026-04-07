import React from "react";

const ListingCardSkeleton = () => {
    return (
        <div className="col-span-1 p-5 shadow-sm rounded-2xl border border-neutral-100/50">
            <div className="flex flex-col gap-2 w-full animate-pulse">
                {/* Image area skeleton */}
                <div className="aspect-square w-full relative overflow-hidden rounded-xl bg-neutral-100" />

                {/* Title and rating line */}
                <div className="flex justify-between items-center mt-2">
                    <div className="h-5 w-2/3 bg-neutral-100 rounded-md" />
                    <div className="h-5 w-8 bg-neutral-100 rounded-md" />
                </div>

                {/* Category and location line */}
                <div className="h-4 w-1/2 bg-neutral-100 rounded-md mt-0.5" />

                {/* Price line */}
                <div className="flex items-center mt-2">
                    <div className="h-5 w-1/3 bg-neutral-100 rounded-md" />
                </div>
            </div>
        </div>
    );
};

export default ListingCardSkeleton;
