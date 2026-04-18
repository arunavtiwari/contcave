import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";

import Skeleton from "@/components/ui/Skeleton";

export default function ListingHeadSkeleton() {
    return (
        <>
            <div className="flex gap-2">
                <div className="min-w-50">
                    {/* Title skeleton */}
                    <Skeleton className="h-9 w-100 mb-2" />
                    {/* Subtitle skeleton */}
                    <Skeleton className="h-4 w-32 mt-2" />
                </div>
                <div className="pt-1">
                    {/* Heart button skeleton */}
                    <Skeleton className="h-6 w-6" />
                </div>
            </div>

            {/* Grid skeleton (simulating the 5-photo grid for desktop) */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-1 mt-4">
                {/* Main large image */}
                <Skeleton className="relative h-113.75 rounded-l-lg" />

                {/* 4 smaller images */}
                <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
                    <Skeleton />
                    <Skeleton className="rounded-tr-lg" />
                    <Skeleton />
                    <Skeleton className="rounded-br-lg" />
                </div>
            </div>

            {/* Mobile skeleton (Swiper view simulation) */}
            <div className="lg:hidden mt-4">
                <div className="relative group">
                    <Skeleton className="w-full h-[60vh] rounded-xl" />

                    <div className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10 bg-foreground/60 p-2 rounded-full border border-background/50">
                        <HiOutlineChevronLeft className="text-background opacity-50" size={24} />
                    </div>
                    <div className="absolute top-1/2 right-3 transform -translate-y-1/2 z-10 bg-foreground/60 p-2 rounded-full border border-background/50">
                        <HiOutlineChevronRight className="text-background opacity-50" size={24} />
                    </div>
                </div>
            </div>
        </>
    );
}
