"use client";

import { Toaster } from "sonner";

function ToastContainerBar() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "bg-background/50 backdrop-blur-lg border border-border shadow-sm rounded-2xl text-foreground font-medium p-4 flex items-center gap-3 min-w-[350px]",
          }
        }}
      />
    </>
  );
}

export default ToastContainerBar;
