import Skeleton from "@/components/ui/Skeleton";

const SettingsSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-6 w-64" />
        </div>

        <div className="flex flex-col gap-5">
            <div className="pl-4">
                <div className="flex flex-col gap-5 border-l border-border/50 pl-6 ml-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-4 relative">
                            <div className="absolute -left-7.75 top-1 w-2 h-2 rounded-full bg-border" />
                            <Skeleton className="h-7 w-32" />
                            <div className="pl-4 space-y-3">
                                <Skeleton className="h-5 w-full max-w-md" />
                                <Skeleton className="h-5 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-destructive/5 p-6 rounded-2xl border border-destructive/20">
                <Skeleton className="h-7 w-32 mb-4" />
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-5 w-full max-w-lg mb-6" />
                <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
        </div>
    </div>
);

export default SettingsSkeleton;
