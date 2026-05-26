"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import getTransaction from "@/app/actions/getTransaction";
import PaymentAnimation from "@/components/PaymentSuccessAnimation";
import Button from "@/components/ui/Button";

interface SerializedListing {
  id: string;
  title: string;
  locationValue?: string | null;
  actualLocation?: unknown;
}

interface SerializedReservation {
  id: string;
  bookingId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  isApproved?: number | null;
  isApprove?: number | null;
  listing?: SerializedListing | null;
}

interface CashfreeReturnStatusClientProps {
  tid: string;
  listingId: string;
  initialStatus: string;
  initialReservation: SerializedReservation | null;
}

export default function CashfreeReturnStatusClient({
  tid,
  listingId,
  initialStatus,
  initialReservation,
}: CashfreeReturnStatusClientProps) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [reservation, setReservation] = useState<SerializedReservation | null>(initialReservation);

  useEffect(() => {
    if (status !== "PENDING") return;

    let attempts = 0;
    const maxAttempts = 6;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await getTransaction({ tid });
        if (res) {
          const currentStatus = res.status;
          if (currentStatus === "SUCCESS") {
            clearInterval(interval);
            setStatus("SUCCESS");
            if (res.reservation) {
              setReservation(res.reservation as unknown as SerializedReservation);
            }
          } else if (currentStatus === "FAILED" || currentStatus === "EXPIRED") {
            clearInterval(interval);
            setStatus("FAILED");
          } else if (currentStatus === "CANCELLED") {
            clearInterval(interval);
            setStatus("CANCELLED");
          }
        }
      } catch (err) {
        console.error("[CashfreeReturnStatusClient] Error polling transaction status:", err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatus("CANCELLED");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, tid]);

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  const getPublicVenueLocation = (listing: SerializedListing | null | undefined) => {
    if (!listing) return "";
    if (listing.locationValue) return listing.locationValue;

    const location = listing.actualLocation;
    if (!location || typeof location !== "object") return "";

    const value = location as Record<string, unknown>;
    const parts = [value.city, value.town, value.village, value.state, value.country]
      .map((part) => typeof part === "string" ? part.trim() : "")
      .filter(Boolean);

    return Array.from(new Set(parts)).join(", ");
  };

  const getApproveCode = (resv: SerializedReservation | null | undefined) => {
    const value = resv?.isApproved ?? resv?.isApprove;
    if (value === 0 || value === 1) return value;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const approval = reservation ? getApproveCode(reservation) : undefined;
  const isConfirmed = status === "SUCCESS" && approval === 1;
  const isPendingApproval = status === "SUCCESS" && approval === 0;

  const listingHref = listingId ? `/listings/${listingId}` : "/";

  if (status === "PENDING") {
    return (
      <main className="min-h-[calc(100vh-5rem)] w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
        <div className="w-full rounded-xl border border-border bg-card p-8 flex flex-col items-center space-y-6 text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted border-t-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Verifying your payment...</h2>
          <p className="text-muted-foreground max-w-md">
            Please do not refresh this page, close the browser window, or click the back button. We are confirming your payment details with Cashfree.
          </p>
        </div>
      </main>
    );
  }

  if (status === "SUCCESS" && reservation) {
    const venueTitle = reservation.listing?.title ?? "-";
    const venueLocation = getPublicVenueLocation(reservation.listing);
    const heading = isConfirmed
      ? "Your reservation has been confirmed!"
      : "Your reservation request has been sent to the studio!";
    const subtext = isPendingApproval
      ? "We'll notify you as soon as the studio reviews your booking."
      : undefined;

    return (
      <main className="min-h-[calc(100vh-5rem)] w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <PaymentAnimation status="success" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-4">{heading}</h1>
            {subtext && <p className="text-muted-foreground">{subtext}</p>}
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-5 space-y-4">
            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase text-center border-b border-border/60 pb-3">
              Reservation Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-muted-foreground">Booking ID</span>
                <span className="text-foreground font-mono">#{reservation.bookingId}</span>
              </div>
              <div>
                <span className="block font-medium text-muted-foreground">Venue</span>
                <span className="text-foreground">
                  {venueTitle}
                  {venueLocation && <span className="text-muted-foreground font-normal"> - {venueLocation}</span>}
                </span>
              </div>
              <div>
                <span className="block font-medium text-muted-foreground">Date</span>
                <span className="text-foreground">
                  {dateFormatter.format(new Date(reservation.startDate))}
                </span>
              </div>
              <div>
                <span className="block font-medium text-muted-foreground">Time Slot</span>
                <span className="text-foreground">
                  {reservation.startTime} - {reservation.endTime}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="block font-medium text-muted-foreground">Amount Paid</span>
                <span className="text-foreground font-semibold">
                  {inr.format(reservation.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {isConfirmed ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm tracking-wide uppercase">Venue Guidelines</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                <li>Please arrive at least 15 minutes before your scheduled start time.</li>
                <li>Handle all equipment and studio property with care.</li>
                <li>Keep noise levels mindful of the surrounding rooms/businesses.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm tracking-wide uppercase">What happens next</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                <li>The studio owner has been notified and will review your request shortly.</li>
                <li>You'll receive a confirmation email and SMS once approved.</li>
                <li>You can check the real-time status under your dashboard's bookings tab.</li>
              </ul>
            </div>
          )}

          <div className="pt-2">
            <Button label="GO TO MY BOOKINGS" href="/dashboard/bookings" className="w-full" />
          </div>
        </motion.div>
      </main>
    );
  }

  if (status === "CANCELLED") {
    return (
      <main className="min-h-[calc(100vh-5rem)] w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-xl border border-border bg-card p-8 flex flex-col items-center space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Payment Cancelled</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The payment process was cancelled or did not complete. If any money was deducted from your account, it will be automatically refunded.
            </p>
          </div>
          <div className="w-full max-w-sm pt-4 flex flex-col gap-3">
            <Button label="RETRY BOOKING" href={listingHref} className="w-full" />
            <Button label="VIEW DASHBOARD" href="/dashboard/bookings" variant="outline" className="w-full" />
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-border bg-card p-8 flex flex-col items-center space-y-6 text-center"
      >
        <PaymentAnimation status="error" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-4">Your payment could not be completed</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't process your payment. Don't worry, no charges were captured for this attempt. You can try again using the button below.
          </p>
        </div>
        <div className="w-full max-w-sm pt-4 flex flex-col gap-3">
          <Button label="BACK TO STUDIO" href={listingHref} className="w-full" />
          <p className="text-xs text-muted-foreground pt-2">
            Need help? Contact us at{" "}
            <a href="mailto:info@contcave.com" className="underline hover:text-foreground transition">
              info@contcave.com
            </a>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
