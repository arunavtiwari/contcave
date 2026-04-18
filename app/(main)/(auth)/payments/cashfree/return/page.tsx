import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import getReservation from "@/app/actions/getReservation";
import getTransaction from "@/app/actions/getTransaction";
import PaymentAnimation from "@/components/PaymentSuccessAnimation";
import Button from "@/components/ui/Button";


export const metadata: Metadata = {
    title: "Payment Status",
    description: "Review the outcome of your recent ContCave payment and see next steps.",
    robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
    },
};

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

const pickFirst = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : v?.[0] ?? "";


const getApproveCode = (r: { isApproved?: number | null; isApprove?: number | null }) => {
    const v = r?.isApproved ?? r?.isApprove;
    if (v === 0 || v === 1) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export default async function CashfreeReturnPage({ searchParams }: Props) {
    const sp = await searchParams;
    const tid = pickFirst(sp.order_id ?? sp.tid);

    if (!tid) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-3xl font-bold">Your Reservation</h1>
                <p className="mt-4 text-xl text-red-600">
                    Missing <code>order_id</code> (or <code>tid</code>) in URL.
                </p>
            </main>
        );
    }

    const transaction = await getTransaction({ tid });
    const reservation =
        transaction?.reservation ?? (await getReservation({ tid }));

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

                    <div className="w-14 h-14 border-4 border-gray-300 border-t-foreground rounded-full animate-spin"></div>

                    <h2 className="text-2xl font-bold text-center">Verifying your payment...</h2>
                    <p className="text-lg text-neutral-600 text-center">
                        This may take a few seconds. Please wait while we confirm your reservation.
                    </p>
                </div>
            </main>
        );
    }

    const approval = getApproveCode(reservation);
    const txnFailed =
        String(transaction?.status ?? "").toUpperCase() === "FAILED";

    const isFailed = txnFailed;
    const isConfirmed = !isFailed && approval === 1;
    const isPending = !isFailed && approval === 0;

    const inr = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });
    const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

    const venueTitle = reservation.listing?.title ?? "—";
    const venueAddress =
        reservation.listing?.actualLocation &&
            typeof reservation.listing.actualLocation === "object" &&
            (reservation.listing.actualLocation as { display_name?: string })
                .display_name
            ? (reservation.listing.actualLocation as { display_name?: string })
                .display_name!
            : "";

    const heading = isConfirmed
        ? "Your reservation has been confirmed!"
        : isPending
            ? "Your reservation request has been sent to the studio!"
            : "Your reservation could not be completed";

    const subtext = isPending
        ? "We'll notify you as soon as it's confirmed."
        : isFailed
            ? "Don’t worry, you can try again with the same or a different payment method."
            : undefined;

    const listingHref = listingId ? `/listings/${listingId}` : "/";
    const primaryCtaHref = isFailed ? listingHref : "/bookings";
    const primaryCtaLabel = isFailed ? "BACK TO STUDIO" : "GO TO MY BOOKINGS";

    const ReservationBlock = (
        <>
            <p className="text-base text-center font-bold">
                Reservation ID: #{reservation.bookingId}
            </p>
            <ul className="mt-3 list-disc pl-4 space-y-1 text-base">
                <li>
                    <span className="font-medium">Venue:</span> {venueTitle}
                    {venueAddress && <span> — {venueAddress}</span>}
                </li>
                <li>
                    <span className="font-medium">Date:</span>{" "}
                    {dateFmt.format(new Date(reservation.startDate))}
                </li>
                <li>
                    <span className="font-medium">Time:</span> {reservation.startTime} -{" "}
                    {reservation.endTime}
                </li>
                <li>
                    <span className="font-medium">Amount:</span>{" "}
                    {inr.format(reservation.totalPrice)}
                </li>
            </ul>
        </>
    );

    return (
        <main className="max-w-3xl mx-auto p-6 flex items-center">
            <div className="mx-auto rounded-xl border bg-background/90 backdrop-blur p-6 ">
                <h1 className="text-2xl font-semibold text-center">{heading}</h1>
                {(isConfirmed || isFailed) && (
                    <div className="flex justify-center my-6">
                        <PaymentAnimation status={isFailed ? "error" : "success"} />
                    </div>
                )}
                {subtext && (
                    <p className="mt-1 text-lg text-neutral-800 text-center">{subtext}</p>
                )}

                {!isFailed && (
                    <div className="mt-4 rounded-lg border p-4">{ReservationBlock}</div>
                )}

                {isConfirmed && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">Venue Guidelines:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Please arrive at least 15 minutes early.</li>
                            <li>Handle all equipment &amp; property with care.</li>
                            <li>Keep noise levels mindful of the surroundings.</li>
                        </ul>
                    </div>
                )}

                {isPending && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">What happens next:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Your request has been sent to the studio.</li>
                            <li>We&apos;ll notify you as soon as it&apos;s confirmed.</li>
                            <li>You can track status anytime on the My Bookings page.</li>
                        </ul>
                    </div>
                )}

                {isFailed && (
                    <div className="mt-4 space-y-2 text-base">
                        <p className="font-bold">Payment failed</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>
                                Your payment didn&apos;t go through, so this reservation isn&apos;t
                                completed.
                            </li>
                            <li>No charges were captured for this attempt.</li>
                            <li>
                                Go back to the studio to try again with the same or a different
                                payment method.
                            </li>
                        </ul>
                    </div>
                )}

                <div className="mt-6 text-center flex">
                    <Link href={primaryCtaHref} className="w-full">
                        <Button label={primaryCtaLabel} />
                    </Link>
                </div>

                {isFailed && (
                    <p className="mt-3 text-sm text-neutral-500">
                        Need help? Write to{" "}
                        <a
                            href="mailto:info@contcave.com"
                            className="underline underline-offset-2"
                        >
                            info@contcave.com
                        </a>
                        .
                    </p>
                )}
            </div>
        </main>
    );
}
