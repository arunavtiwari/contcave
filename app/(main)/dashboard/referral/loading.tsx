import Skeleton from "@/components/ui/Skeleton";

export default function ReferralLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
    );
}
