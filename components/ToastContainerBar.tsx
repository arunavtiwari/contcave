"use client";

import { Toaster } from "sonner";

function ToastContainerBar() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: "bg-background/70 backdrop-blur-md border border-border shadow-md rounded-xl text-foreground font-medium",
        }}
      />
    </>
  );
}

export default ToastContainerBar;
