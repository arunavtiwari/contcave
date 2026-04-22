import React from "react";

import ListingCard from "@/components/listing/ListingCard";

interface ListingGridSkeletonProps {
    count?: number;
    hideActions?: boolean;
}

const ListingGridSkeleton: React.FC<ListingGridSkeletonProps> = ({
    count = 6,
    hideActions = false
}) => {
    return (
        <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(count)].map((_, i) => (
                <ListingCard key={i} isLoading hideActions={hideActions} />
            ))}
        </div>
    );
}

export default ListingGridSkeleton;
