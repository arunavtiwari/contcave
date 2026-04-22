import Container from "@/components/Container";
import ListingHeadSkeleton from "@/components/listing/ListingHeadSkeleton";
import ListingInfoSkeleton from "@/components/listing/ListingInfoSkeleton";
import ListingReservationSkeleton from "@/components/listing/ListingReservationSkeleton";

export default function ListingSkeleton() {
    return (
        <div className="pt-10">
            <Container>
                <div className="max-w-280 mx-auto pb-24">
                    <div className="flex flex-col gap-2">
                        <ListingHeadSkeleton />
                        <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
                            <ListingInfoSkeleton />
                            <div className="order-first mb-10 md:order-last md:col-span-3">
                                <ListingReservationSkeleton />
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>

    );
}
