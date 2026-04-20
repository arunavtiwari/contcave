import React from "react";
import ListingCard from "./ListingCard";

interface BookingGridSkeletonProps {
    count?: number;
}

const BookingGridSkeleton: React.FC<BookingGridSkeletonProps> = ({
    count = 6
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(count)].map((_, i) => (
                <ListingCard key={i} isLoading />
            ))}
        </div>
    );
};

export default BookingGridSkeleton;
