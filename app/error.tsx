"use client";

import { useEffect } from "react";

import EmptyState from "@/components/EmptyState";

type Props = {
  error: Error;
};

function ErrorState({ error }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Error Boundary]', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else {
      console.error("🚀 ~ file: error.tsx:12 ~ ErrorState ~ error:", error);
    }
  }, [error]);

  return <EmptyState title="Uh Oh" subtitle="Something went wrong!" />;
}

export default ErrorState;
