"use client";

import { toast, Toaster as SonnerToaster } from "sonner";

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "bg-background/90 backdrop-blur-md border border-border rounded-2xl text-foreground font-medium p-4 flex items-center gap-3 min-w-[340px]",
          description: "text-muted-foreground text-xs",
          error: "border-destructive/30 bg-destructive/10 text-destructive",
          success:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        },
      }}
    />
  );
}

export default Toaster;
