import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";
import Heading from "@/components/ui/Heading";

export default function Loading() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
                <ListingCardSkeleton key={i} />
            ))}
        </div>
    );
}
