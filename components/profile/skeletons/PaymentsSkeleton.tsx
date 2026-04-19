import Skeleton from "@/components/ui/Skeleton";

const PaymentsSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        <nav className="relative inline-flex bg-muted rounded-full p-1 w-fit self-center border border-border gap-1">
            <Skeleton className="h-11 w-48 rounded-full!" />
            <Skeleton className="h-11 w-40 rounded-full" />
        </nav>

        <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-11 w-24 rounded-xl" />
            </div>

            <div className="space-y-4 rounded-xl border border-border p-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2 mt-4">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-48" />
            </div>

            <div className="space-y-4 rounded-xl border border-border p-6">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default PaymentsSkeleton;
