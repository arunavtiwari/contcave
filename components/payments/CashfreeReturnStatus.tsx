import Link from "next/link";
import { redirect } from "next/navigation";

import getReservation from "@/app/actions/getReservation";
import getTransaction from "@/app/actions/getTransaction";
import PaymentAnimation from "@/components/PaymentSuccessAnimation";
import Button from "@/components/ui/Button";

type Search = Record<string, string | string[] | undefined>;

const pickFirst = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : value?.[0] ?? "";

const getApproveCode = (reservation: { isApproved?: number | null; isApprove?: number | null }) => {
    const value = reservation?.isApproved ?? reservation?.isApprove;
    if (value === 0 || value === 1) return value;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

const getPublicVenueLocation = (listing: { locationValue?: string | null; actualLocation?: unknown } | null | undefined) => {
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

export default async function CashfreeReturnStatus({ searchParams }: { searchParams: Search }) {
    const tid = pickFirst(searchParams.order_id ?? searchParams.tid);

    if (!tid) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-3xl font-bold">Your Reservation</h1>
                <p className="mt-4 text-xl text-destructive font-medium">
                    Missing <code>order_id</code> or <code>tid</code> in URL.
                </p>
            </main>
        );
    }

    const transaction = await getTransaction({ tid });
    const reservation = transaction?.reservation ?? (await getReservation({ tid }));

    const txStatus = String(transaction?.status ?? "").toUpperCase();
    const listingId =
        reservation?.listing?.id ||
        reservation?.listingId ||
        transaction?.listing?.id ||
        transaction?.listingId ||
        "";

    if (txStatus === "CANCELLED") {
        redirect(listingId ? `/listings/${listingId}` : "/bookings");
    }

    if (!reservation) {
        return (
            <main className="max-w-xl mx-auto p-6 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-6">
                    <div className="w-14 h-14 border-4 border-border border-t-primary rounded-full animate-spin" />
                    <h2 className="text-2xl font-bold text-center">Verifying your payment...</h2>
                    <p className="text-lg text-muted-foreground text-center">
                        This may take a few seconds. Please wait while we confirm your reservation.
                    </p>
                </div>
            </main>
        );
    }

    const approval = getApproveCode(reservation);
    const isFailed = txStatus === "FAILED";
    const isConfirmed = !isFailed && approval === 1;
    const isPending = !isFailed && approval === 0;

    const inr = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });
    const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

    const venueTitle = reservation.listing?.title ?? "-";
    const venueLocation = getPublicVenueLocation(reservation.listing);

    const heading = isConfirmed
        ? "Your reservation has been confirmed!"
        : isPending
            ? "Your reservation request has been sent to the studio!"
            : "Your reservation could not be completed";

    const subtext = isPending
        ? "We'll notify you as soon as it's confirmed."
        : isFailed
            ? "Don't worry, you can try again with the same or a different payment method."
            : undefined;

    const listingHref = listingId ? `/listings/${listingId}` : "/";
    const primaryCtaHref = isFailed ? listingHref : "/dashboard/bookings";
    const primaryCtaLabel = isFailed ? "BACK TO STUDIO" : "GO TO MY BOOKINGS";

    const reservationBlock = (
        <>
            <p className="text-base text-center font-bold">
                Reservation ID: #{reservation.bookingId}
            </p>
            <ul className="mt-3 list-disc pl-4 space-y-1 text-base">
                <li>
                    <span className="font-medium">Venue:</span> {venueTitle}
                    {venueLocation && <span> - {venueLocation}</span>}
                </li>
                <li>
                    <span className="font-medium">Date:</span>{" "}
                    {dateFormatter.format(new Date(reservation.startDate))}
                </li>
                <li>
                    <span className="font-medium">Time:</span> {reservation.startTime} - {reservation.endTime}
                </li>
                <li>
                    <span className="font-medium">Amount:</span> {inr.format(reservation.totalPrice)}
                </li>
            </ul>
        </>
    );

    return (
        <main className="min-h-[calc(100vh-5rem)] w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
            <div className="mx-auto rounded-xl border bg-background/90 backdrop-blur p-5 sm:p-6">
                <h1 className="text-2xl font-semibold text-center">{heading}</h1>
                {(isConfirmed || isFailed) && (
                    <div className="flex justify-center my-6">
                        <PaymentAnimation status={isFailed ? "error" : "success"} />
                    </div>
                )}
                {subtext && <p className="mt-1 text-lg text-foreground/80 text-center">{subtext}</p>}

                {!isFailed && <div className="mt-4 rounded-lg border p-4">{reservationBlock}</div>}

                {isConfirmed && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">Venue Guidelines:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Please arrive at least 15 minutes early.</li>
                            <li>Handle all equipment and property with care.</li>
                            <li>Keep noise levels mindful of the surroundings.</li>
                        </ul>
                    </div>
                )}

                {isPending && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">What happens next:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Your request has been sent to the studio.</li>
                            <li>We'll notify you as soon as it's confirmed.</li>
                            <li>You can track status anytime on the My Bookings page.</li>
                        </ul>
                    </div>
                )}

                {isFailed && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">Payment failed</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Your payment did not go through, so this reservation is not completed.</li>
                            <li>No charges were captured for this attempt.</li>
                            <li>Go back to the studio to try again with the same or a different payment method.</li>
                        </ul>
                    </div>
                )}

                <div className="mt-6 text-center flex">
                    <Link href={primaryCtaHref} className="w-full">
                        <Button label={primaryCtaLabel} />
                    </Link>
                </div>

                {isFailed && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Need help? Write to{" "}
                        <a href="mailto:info@contcave.com" className="underline underline-offset-2">
                            info@contcave.com
                        </a>
                        .
                    </p>
                )}
            </div>
        </main>
    );
}
