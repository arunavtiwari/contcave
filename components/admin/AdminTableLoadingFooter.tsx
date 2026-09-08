import Skeleton from "@/components/ui/Skeleton";

export default function AdminTableLoadingFooter() {
  return (
    <footer className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/95 px-5" aria-label="Loading table pagination">
      <Skeleton className="h-3 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </footer>
  );
}
