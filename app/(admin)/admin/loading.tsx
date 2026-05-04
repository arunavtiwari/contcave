import Skeleton from "@/components/ui/Skeleton";

export default function AdminLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-40 w-80 rounded-xl" />
        </div>
    );
}
