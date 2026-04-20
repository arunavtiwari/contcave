import Skeleton from "@/components/ui/Skeleton";

const MyProfileSkeleton = () => (
    <div className="flex flex-col w-full gap-8">
        <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-6 w-96 max-w-full" />
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                    <div className="h-24 w-full bg-neutral-100 dark:bg-neutral-800/10 relative">
                        <div className="absolute -bottom-12 left-8">
                            <Skeleton className="w-24 h-24 rounded-full border-4 border-background" />
                        </div>
                    </div>
                    <div className="pt-14 py-6 px-8">
                        <div className="flex justify-between mb-6 gap-8 items-center">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>

                <div className="bg-background rounded-2xl border border-border p-8">
                    <Skeleton className="h-6 w-40 mb-8" />
                    <div className="flex flex-col gap-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center sm:gap-0 gap-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                                <Skeleton className="h-5 w-40 max-w-[50%]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <Skeleton className="w-16 h-16 rounded-full! " />
                        <div className="flex flex-col items-center gap-2 w-full">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Skeleton className="h-11 w-full rounded-xl mt-4" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default MyProfileSkeleton;
