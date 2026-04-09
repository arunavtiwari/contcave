import MapPin from "lucide-react/dist/esm/icons/map-pin";

import Container from "@/components/Container";
import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";
import Categories from "@/components/navbar/Categories";

export default function Loading() {
    return (
        <main>
            <Container>
                <Categories />
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="h-7 w-48 bg-neutral-100 rounded animate-pulse" />
                            <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-200 rounded-xl text-neutral-400 cursor-not-allowed"
                            >
                                <MapPin size={16} />
                                Sort by distance
                            </button>
                        </div>
                    </div>

                    <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-x-hidden">
                        {[...Array(8)].map((_, i) => (
                            <ListingCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </Container>
        </main>
    );
}
