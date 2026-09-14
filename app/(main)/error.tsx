"use client";

import { useEffect } from "react";

import ErrorState from "@/components/ui/ErrorState";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalMainError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Application Error Boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      name: error.name,
    });
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      subtitle="We encountered an unexpected error while rendering this page. You can try refreshing or returning home."
      error={error}
      reset={reset}
      homeHref="/"
      homeLabel="Go to Homepage"
    />
  );
}
