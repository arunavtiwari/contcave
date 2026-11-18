import Spinner from "@/components/ui/Spinner";

/** Blocks the page while a long action runs, saying what is happening. */
export default function LoadingOverlay({ title, description }: { title: string; description?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-1000 flex items-center justify-center bg-foreground/60 backdrop-blur-sm"
    >
      <div className="mx-4 flex w-full max-w-sm animate-menu-in flex-col items-center gap-6 rounded-2xl border border-border bg-background px-10 py-12 text-center">
        <Spinner size="lg" />
        <div>
          <p className="text-xl font-semibold text-foreground">{title}</p>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>
  );
}
