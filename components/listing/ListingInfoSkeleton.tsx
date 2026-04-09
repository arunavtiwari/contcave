export default function ListingInfoSkeleton() {
    return (
        <div className="flex flex-col gap-8 md:col-span-4">
            <div className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 bg-neutral-100 animate-pulse rounded-full" />
                <div className="flex flex-col gap-2 flex-1">
                    <div className="h-6 w-1/2 bg-neutral-100 animate-pulse rounded-md" />
                    <div className="h-4 w-1/4 bg-neutral-100 animate-pulse rounded-md" />
                </div>
            </div>
            <hr className="border-neutral-100" />
            <div className="space-y-4">
                <div className="h-5 w-full bg-neutral-100 animate-pulse rounded-md" />
                <div className="h-5 w-full bg-neutral-100 animate-pulse rounded-md" />
                <div className="h-5 w-3/4 bg-neutral-100 animate-pulse rounded-md" />
            </div>
            <hr className="border-neutral-100" />
            <div className="space-y-4">
                <div className="h-8 w-40 bg-neutral-100 animate-pulse rounded-md" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 w-full bg-neutral-100 animate-pulse rounded-xl" />
                    <div className="h-24 w-full bg-neutral-100 animate-pulse rounded-xl" />
                </div>
            </div>
        </div>
    );
}
