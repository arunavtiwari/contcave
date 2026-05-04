import Skeleton from "@/components/ui/Skeleton";

export default function AboutLoading() {
    return (
        <div className="pt-24 px-4 sm:px-8 max-w-360 mx-auto space-y-8">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-3/4" />
            </div>
        </div>
    );
}
