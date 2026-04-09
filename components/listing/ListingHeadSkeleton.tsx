import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import Heading from "../ui/Heading";

export default function ListingHeadSkeleton() {
    return (
        <>
            <div className="flex gap-2">
                <div className="min-w-50">
                    {/* Title skeleton */}
                    <div className="h-8 w-100 bg-neutral-200 animate-pulse rounded-md mb-2"></div>
                    {/* Subtitle skeleton */}
                    <div className="h-4 w-32 bg-neutral-200 animate-pulse rounded-md mt-2"></div>
                </div>
                <div className="pt-1">
                    {/* Heart button skeleton */}
                    <div className="h-6 w-6 bg-neutral-200 animate-pulse rounded-md"></div>
                </div>
            </div>

            {/* Grid skeleton (simulating the 5-photo grid for desktop) */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-1 mt-4">
                {/* Main large image */}
                <div className="relative h-113.75 bg-neutral-200 animate-pulse rounded-l-lg"></div>

                {/* 4 smaller images */}
                <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
                    <div className="bg-neutral-200 animate-pulse"></div>
                    <div className="bg-neutral-200 animate-pulse rounded-tr-lg"></div>
                    <div className="bg-neutral-200 animate-pulse"></div>
                    <div className="bg-neutral-200 animate-pulse rounded-br-lg"></div>
                </div>
            </div>

            {/* Mobile skeleton (Swiper view simulation) */}
            <div className="lg:hidden mt-4">
                <div className="relative group">
                    <div className="w-full h-[60vh] bg-neutral-200 animate-pulse rounded-xl"></div>

                    <div className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10 bg-black/60 p-2 rounded-full border border-white/50">
                        <HiOutlineChevronLeft className="text-white opacity-50" size={24} />
                    </div>
                    <div className="absolute top-1/2 right-3 transform -translate-y-1/2 z-10 bg-black/60 p-2 rounded-full border border-white/50">
                        <HiOutlineChevronRight className="text-white opacity-50" size={24} />
                    </div>
                </div>
            </div>
        </>
    );
}
