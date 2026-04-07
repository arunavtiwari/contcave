import Container from "@/components/Container";
import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";
import Heading from "@/components/ui/Heading";

export default function Loading() {
    return (
        <Container>
            <Heading title="Favorites" subtitle="List of places you favorites!" />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {[...Array(8)].map((_, i) => (
                    <ListingCardSkeleton key={i} />
                ))}
            </div>
        </Container>
    );
}
