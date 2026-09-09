"use client";

import { useEffect } from "react";

import ErrorState from "@/components/ui/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      subtitle="We encountered an unexpected error while loading your dashboard. You can try again or return home."
      error={error}
      reset={reset}
      homeHref="/dashboard/bookings"
      homeLabel="My Bookings"
    />
  );
}
