import Container from "@/components/Container";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import { categories } from "@/components/navbar/categoriesData";
import Skeleton from "@/components/ui/Skeleton";

export default function HomeLoading() {
    return (
        <main>
            <Container>
                {/* Categories Loader - matches the structure of Categories fallback */}
                <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-border">
                    <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
                        {categories.map((item) => (
                            <div key={item.label} className="flex flex-col items-center justify-center gap-2 p-3 border-b-2 border-transparent text-muted-foreground/30">
                                <item.icon size={26} />
                                <div className="font-medium text-xs w-fit whitespace-nowrap">{item.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="shrink-0">
                        <div className="h-8 w-24 rounded-full bg-muted border border-border opacity-20" />
                    </div>
                </div>

                {/* Header Loader - matches ListingFeedHeader */}
                <div className="mb-8">
                    <div className="flex items-center justify-between gap-4 h-14">
                        <Skeleton className="h-7 w-48 rounded-md" />
                        <Skeleton className="h-10 w-40 rounded-xl" />
                    </div>
                </div>

                {/* Listings Grid */}
                <ListingGridSkeleton count={8} hideActions />
            </Container>
        </main>
    );
}
