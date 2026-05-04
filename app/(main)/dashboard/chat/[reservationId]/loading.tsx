import Skeleton from "@/components/ui/Skeleton";

export default function ChatLoading() {
    return (
        <div className="flex flex-col gap-4 w-full h-[calc(100vh-200px)]">
            <div className="flex items-center gap-4 p-4 border-b border-border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex-1 flex flex-col gap-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className={`h-12 rounded-xl ${i % 2 === 0 ? "w-2/3 self-start" : "w-1/2 self-end"}`}
                    />
                ))}
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
        </div>
    );
}
