"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { trackSignup } from "@/lib/analytics/tracking";

const SIGNUP_SIGNAL_MAX_AGE_MS = 10 * 60 * 1000;

interface GoogleSignupCompleteProps {
  callbackUrl: string;
  eventCreatedAt: number | null;
  eventId: string | null;
}

export default function GoogleSignupComplete({
  callbackUrl,
  eventCreatedAt,
  eventId,
}: GoogleSignupCompleteProps) {
  const router = useRouter();

  useEffect(() => {
    const now = Date.now();
    const isRecentSignup = eventCreatedAt !== null
      && Number.isFinite(eventCreatedAt)
      && eventCreatedAt <= now + 60_000
      && now - eventCreatedAt <= SIGNUP_SIGNAL_MAX_AGE_MS;

    if (eventId && isRecentSignup) {
      trackSignup({ method: "google", eventId });
    }

    let destination = "/";
    try {
      const candidate = new URL(callbackUrl || "/", window.location.origin);
      if (candidate.origin === window.location.origin && candidate.pathname !== "/auth/new-user") {
        destination = `${candidate.pathname}${candidate.search}${candidate.hash}`;
      }
    } catch {
      // A malformed or cross-origin callback URL falls back to the home page.
    }

    const timeout = window.setTimeout(() => router.replace(destination), 100);
    return () => window.clearTimeout(timeout);
  }, [callbackUrl, eventCreatedAt, eventId, router]);

  return (
    <main className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-6 text-center">
      <p role="status" className="text-muted-foreground">
        Finishing your ContCave sign-up…
      </p>
    </main>
  );
}
