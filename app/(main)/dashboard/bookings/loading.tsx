import BookingCardSkeleton from "@/components/listing/BookingCardSkeleton";
import Heading from "@/components/ui/Heading";

export default function Loading() {
    return (
        <>
            <Heading title="My Bookings" subtitle="Spaces booked by you" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <BookingCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}
