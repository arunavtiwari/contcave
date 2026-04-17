import Container from "@/components/Container";
import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";
import Heading from "@/components/ui/Heading";

export default function Loading() {
    return (
        <div className="mt-5">
            <Container>
                <Heading title="My Bookings" subtitle="Spaces booked by you" />
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {[...Array(10)].map((_, i) => (
                        <ListingCardSkeleton key={i} />
                    ))}
                </div>
            </Container>
        </div>
    );
}
