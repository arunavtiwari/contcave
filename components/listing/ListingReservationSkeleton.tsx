export default function ListingReservationSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm w-full animate-pulse flex flex-col gap-6 sticky top-24">
            <div className="flex items-center gap-2">
                <div className="h-8 w-1/3 bg-neutral-100 rounded-md" />
                <div className="h-6 w-1/4 bg-neutral-100 rounded-md" />
            </div>
            <hr className="border-neutral-100" />
            <div className="flex flex-col gap-4">
                <div className="h-14 w-full bg-neutral-100 rounded-lg" />
                <div className="h-14 w-full bg-neutral-100 rounded-lg" />
            </div>
            <div className="h-32 w-full bg-neutral-100 rounded-lg" />
            <div className="h-12 w-full bg-neutral-800 animate-pulse opacity-50 xl:px-4 rounded-full mt-4" />
        </div>
    );
}
