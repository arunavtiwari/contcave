import Container from "@/components/Container";

import ListingHeadSkeleton from "./ListingHeadSkeleton";

export default function ListingSkeleton() {
    return (
        <div className="pt-10">
            <Container>
                <div className="max-w-280 mx-auto pb-24">
                    <div className="flex flex-col gap-2">
                        <ListingHeadSkeleton />
                        <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">

                            <div className="flex flex-col gap-8 md:col-span-4">
                                <div className="flex flex-row items-center justify-between gap-4">
                                    <div className="flex flex-col gap-2 flex-1">
                                        <div className="h-6 w-1/2 bg-neutral-200 animate-pulse rounded-md" />
                                        <div className="flex flex-row items-center gap-4 text-neutral-500 font-light text-sm">
                                            <div className="h-4 w-1/4 bg-neutral-200 animate-pulse rounded-md" />
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 bg-neutral-200 animate-pulse rounded-full" />
                                </div>
                                <hr />
                                <div className="h-4 w-full bg-neutral-200 animate-pulse rounded-md" />
                                <div className="h-4 w-full bg-neutral-200 animate-pulse rounded-md" />
                                <div className="h-4 w-3/4 bg-neutral-200 animate-pulse rounded-md" />
                                <hr />
                            </div>

                            <div className="order-first mb-10 md:order-last md:col-span-3">
                                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm pt-6 px-6 pb-6 h-96 w-full animate-pulse flex flex-col gap-4">
                                    <div className="h-6 w-1/3 bg-neutral-200 rounded-md" />
                                    <div className="h-12 w-full bg-neutral-200 rounded-md" />
                                    <div className="h-12 w-full bg-neutral-200 rounded-md" />
                                    <div className="flex-1" />
                                    <div className="h-12 w-full bg-neutral-200 rounded-md" />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
