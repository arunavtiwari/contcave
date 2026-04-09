import Container from "@/components/Container";

export default function Loading() {
    return (
        <div className="pt-10">
            <Container>
                <div className="max-w-280 mx-auto pb-24">
                    <div className="flex flex-col gap-2">

                        {/* ListingHead Skeleton */}
                        <div className="space-y-4">
                            <div className="h-8 w-1/3 bg-neutral-100 rounded-lg animate-pulse" />
                            <div className="flex gap-2">
                                <div className="h-5 w-40 bg-neutral-100 rounded-lg animate-pulse" />
                                <div className="h-5 w-32 bg-neutral-100 rounded-lg animate-pulse" />
                            </div>
                            <div className="w-full h-[60vh] bg-neutral-100 rounded-xl animate-pulse mt-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">

                            {/* ListingInfo Skeleton */}
                            <div className="md:col-span-4 flex flex-col gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-neutral-100 animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="h-6 w-48 bg-neutral-100 rounded animate-pulse" />
                                        <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
                                    </div>
                                </div>
                                <hr className="border-neutral-100" />
                                <div className="space-y-4 py-2">
                                    <div className="h-5 w-full bg-neutral-100 rounded animate-pulse" />
                                    <div className="h-5 w-full bg-neutral-100 rounded animate-pulse" />
                                    <div className="h-5 w-3/4 bg-neutral-100 rounded animate-pulse" />
                                </div>
                                <hr className="border-neutral-100" />
                                <div className="space-y-4 py-2">
                                    <div className="h-8 w-40 bg-neutral-100 rounded animate-pulse" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-24 w-full bg-neutral-100 rounded-xl animate-pulse" />
                                        <div className="h-24 w-full bg-neutral-100 rounded-xl animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* ListingReservation Skeleton */}
                            <div className="order-first mb-10 md:order-last md:col-span-3">
                                <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm w-full h-100">
                                    <div className="flex flex-col gap-4 animate-pulse">
                                        <div className="h-6 w-1/3 bg-neutral-100 rounded" />
                                        <hr className="border-neutral-100" />
                                        <div className="h-14 w-full bg-neutral-100 rounded-lg" />
                                        <div className="h-14 w-full bg-neutral-100 rounded-lg" />
                                        <div className="h-32 w-full bg-neutral-100 rounded-lg" />
                                        <div className="h-12 w-full bg-neutral-100 rounded-lg mt-4" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
