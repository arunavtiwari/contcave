import getReservation from "@/app/actions/getReservation";

type Search = { [key: string]: string | string[] | undefined };
type Props = { searchParams: Promise<Search> };

function pickFirst(v: string | string[] | undefined) {
    if (!v) return "";
    return typeof v === "string" ? v : v[0] ?? "";
}

function classifyStatus(b: any) {
    const raw =
        (b?.status ??
            b?.paymentStatus ??
            b?.confirmationStatus ??
            b?.reservationStatus ??
            "").toString();

    const s = raw.toUpperCase();

    const isConfirmed =
        b?.isConfirmed === true ||
        ["CONFIRMED", "APPROVED", "SUCCESS", "PAID"].includes(s);

    const isFailed =
        ["FAILED", "DECLINED", "CANCELED", "CANCELLED", "EXPIRED"].includes(s) ||
        b?.paymentFailed === true;

    const isPending =
        !isConfirmed &&
        !isFailed &&
        (["PENDING", "REQUESTED", "AWAITING_CONFIRMATION", "PROCESSING"].includes(
            s
        ) ||
            true);

    return { isConfirmed, isPending, isFailed, rawStatus: raw };
}

export default async function CashfreeReturnPage({ searchParams }: Props) {
    const sp = await searchParams;
    const tid = pickFirst(sp.order_id ?? sp.tid);

    if (!tid) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Your Booking</h1>
                <p className="mt-4 text-red-600">
                    Missing <code>order_id</code> (or <code>tid</code>) in URL.
                </p>
            </main>
        );
    }

    const booking = await getReservation({ tid });

    if (!booking) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Your Booking</h1>
                <div className="mt-4 rounded-lg border p-4">
                    <p className="text-sm text-neutral-600">Order ID</p>
                    <p className="font-mono">{tid}</p>
                </div>
                <p className="mt-6 text-red-600">
                    No reservation linked to this order yet. Please refresh in a moment.
                </p>
            </main>
        );
    }

    const inr = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });
    const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    const { isConfirmed, isPending, isFailed } = classifyStatus(booking);

    const ListingBlock = (
        <>
            <div>
                <p className="text-sm text-neutral-600">Booking ID</p>
                <p className="font-mono">#{booking.id}</p>
            </div>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
                <li>
                    <span className="font-medium">Studio:</span>{" "}
                    {booking.listing?.title ?? "—"}
                    {booking.listing?.locationValue ? (
                        <span className="text-neutral-600">
                            {" "}
                            — {booking.listing.locationValue}
                        </span>
                    ) : null}
                </li>
                <li>
                    <span className="font-medium">Date:</span>{" "}
                    {dateFmt.format(new Date(booking.startDate))}
                </li>
                <li>
                    <span className="font-medium">Time:</span>{" "}
                    {booking.startTime} – {booking.endTime}
                </li>
                <li>
                    <span className="font-medium">Amount:</span>{" "}
                    {inr.format(booking.totalPrice)}
                </li>
            </ul>
        </>
    );

    return (
        <main className="max-w-3xl mx-auto p-6">
            {/* Card */}
            <div className="mx-auto max-w-2xl rounded-xl border bg-white/90 backdrop-blur p-6 shadow-sm">
                {/* CONFIRMED */}
                {isConfirmed && (
                    <>
                        <h2 className="text-xl font-bold">Your booking has been confirmed!</h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            Booking ID: <span className="font-mono">#{booking.id}</span>
                        </p>

                        <div className="mt-4 rounded-lg border p-4">{ListingBlock}</div>

                        <div className="mt-4 space-y-2 text-sm">
                            <p className="font-medium">Venue Guidelines:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Arrive 10 minutes early.</li>
                                <li>Maintain cleanliness; pay for any damages.</li>
                                <li>Respect staff and follow studio rules.</li>
                            </ul>
                        </div>

                        <div className="mt-6">
                            <a
                                href="/trips"
                                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:bg-black/90"
                            >
                                GO TO MY BOOKINGS
                            </a>
                        </div>
                    </>
                )}

                {/* PENDING */}
                {isPending && !isConfirmed && !isFailed && (
                    <>
                        <h2 className="text-xl font-bold">
                            Your booking request has been sent to the studio!
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            We’ll notify you as soon as it’s confirmed.
                        </p>

                        <div className="mt-4 rounded-lg border p-4">{ListingBlock}</div>

                        <div className="mt-4 space-y-2 text-sm">
                            <p className="font-medium">What happens next?</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Most requests are approved within 24 hours.</li>
                                <li>
                                    You may receive a call/SMS for any additional details or KYC.
                                </li>
                                <li>
                                    Payment will only be processed after confirmation (if not
                                    already captured).
                                </li>
                            </ul>
                        </div>

                        <div className="mt-6">
                            <a
                                href="/trips"
                                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:bg-black/90"
                            >
                                GO TO MY BOOKINGS
                            </a>
                        </div>
                    </>
                )}

                {/* FAILED */}
                {isFailed && (
                    <>
                        <h2 className="text-xl font-bold">
                            Your payment could not be processed!
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            Don’t worry, you can try again with the same or a different payment
                            method.
                        </p>

                        <div className="mt-4 rounded-lg border p-4">{ListingBlock}</div>

                        <div className="mt-6 flex gap-3">
                            <a
                                href={`/payments/retry?tid=${encodeURIComponent(tid)}`}
                                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:bg-black/90"
                            >
                                RETRY PAYMENT
                            </a>
                            <a
                                href="/"
                                className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-neutral-50"
                            >
                                BACK TO STUDIO
                            </a>
                        </div>

                        <p className="mt-3 text-xs text-neutral-500">
                            Need help? Write to{" "}
                            <a
                                href="mailto:support@contcave.com"
                                className="underline underline-offset-2"
                            >
                                support@contcave.com
                            </a>
                            .
                        </p>
                    </>
                )}
            </div>
        </main>
    );
}
