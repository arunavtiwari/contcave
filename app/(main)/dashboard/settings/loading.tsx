import Skeleton from "@/components/ui/Skeleton";

export default function SettingsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-8 w-12 rounded-full" />
                </div>
            ))}
        </div>
    );
}
