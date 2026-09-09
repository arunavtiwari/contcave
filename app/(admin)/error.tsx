"use client";

import React, { useEffect } from "react";

import ErrorState from "@/components/ui/ErrorState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin System Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <ErrorState
      title="Admin System Error"
      subtitle="An unexpected issue occurred while processing this administrative section. Please retry or navigate back to the dashboard."
      error={error}
      reset={reset}
      homeHref="/admin/dashboard"
      homeLabel="Admin Dashboard"
    />
  );
}
