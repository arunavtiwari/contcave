import Skeleton from "@/components/ui/Skeleton";

const ShareReferSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-3/4 max-w-md" />
            <Skeleton className="h-6 w-full max-w-lg" />
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 border border-foreground/20">
            <Skeleton className="h-7 w-40 mb-6" />
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                        <Skeleton className="h-6 w-full max-w-md" />
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-background rounded-2xl border border-border p-6 space-y-6">
            <Skeleton className="h-7 w-48" />
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-muted/30 p-4 rounded-lg border border-border">
                        <div className="flex justify-between items-center">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-7 w-3/4" />
                            </div>
                            <Skeleton className="h-10 w-24 rounded-lg ml-4" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center sm:flex-row flex-col gap-4">
                <Skeleton className="h-7 w-64" />
                <div className="flex gap-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="w-12 h-12 rounded-full" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default ShareReferSkeleton;
