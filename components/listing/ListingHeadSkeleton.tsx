
import Skeleton from "@/components/ui/Skeleton";

export default function ListingHeadSkeleton() {
    return (
        <>
            <div className="flex flex-col gap-1">
                {/* Title skeleton */}
                <Skeleton className="h-9 w-64 max-w-full mb-2" />
                
                {/* Sub-header row skeleton */}
                <div className="flex items-center justify-between gap-4 mt-1">
                    {/* Location skeleton */}
                    <Skeleton className="h-4 w-32" />
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Share & Save button skeletons */}
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Grid skeleton (simulating the 5-photo grid for desktop) */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-1 mt-4">
                {/* Main large image */}
                <Skeleton className="relative h-113.75 rounded-l-2xl" />

                {/* 4 smaller images */}
                <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
                    <Skeleton />
                    <Skeleton className="rounded-tr-2xl" />
                    <Skeleton />
                    <Skeleton className="rounded-br-2xl" />
                </div>
            </div>

            {/* Mobile skeleton (Swiper view simulation) */}
            <div className="lg:hidden mt-4">
                <Skeleton className="w-full aspect-4/3 lg:aspect-auto lg:h-[60vh] rounded-xl" />
            </div>
        </>
    );
}
