import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";
import Heading from "@/components/ui/Heading";

export default function Loading() {
    return (
        <>
            <Heading title="My Properties" subtitle="Efficiently Manage, Update, and Showcase Your Listings with Ease." />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <ListingCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}
