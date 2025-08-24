// app/payments/cashfree/return/page.tsx
import getReservation from "@/app/actions/getReservation";

type Search = { [key: string]: string | string[] | undefined };
type Props = { searchParams: Promise<Search> };

export default async function CashfreeReturnPage({ searchParams }: Props) {
    // Next.js 15: searchParams is a Promise
    const sp = await searchParams;

    // Prefer Cashfree's ?order_id=..., fall back to your ?rid=...
    const raw = sp.order_id ?? sp.rid;
    const rid =
        typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0]! : "";

    if (!rid) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Your Booking</h1>
                <p className="mt-4 text-red-600">
                    Missing <code>order_id</code> (or <code>rid</code>) in URL.
                </p>
            </main>
        );
    }

    // Fetch the single reservation by Cashfree order id (cfOrderId)
    const booking = await getReservation({ rid });

    if (!booking) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-2xl font-bold">Your Booking</h1>
                <div className="mt-4 rounded-lg border p-4">
                    <p className="text-sm text-neutral-600">Order ID</p>
                    <p className="font-mono">{rid}</p>
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
    const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

    return (
        <main className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold">Your Booking</h1>

            <div className="mt-4 rounded-lg border p-4 space-y-3">
                <div>
                    <p className="text-sm text-neutral-600">Order ID</p>
                    <p className="font-mono">{rid}</p>
                </div>
                <div>
                    <p className="text-sm text-neutral-600">Booking ID</p>
                    <p className="font-mono">{booking.id}</p>
                </div>
                <div>
                    <p className="text-sm text-neutral-600">Listing</p>
                    <p>{booking.listing?.title ?? "—"}</p>
                    {booking.listing?.locationValue ? (
                        <p className="text-sm text-neutral-600">{booking.listing.locationValue}</p>
                    ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-sm text-neutral-600">Date</p>
                        <p>{dateFmt.format(new Date(booking.startDate))}</p>
                    </div>
                    <div>
                        <p className="text-sm text-neutral-600">Time</p>
                        <p>
                            {timeFmt.format(new Date(booking.startTime))} –{" "}
                            {timeFmt.format(new Date(booking.endTime))}
                        </p>
                    </div>
                </div>
                <div>
                    <p className="text-sm text-neutral-600">Amount</p>
                    <p className="font-semibold">{inr.format(booking.totalPrice)}</p>
                </div>
            </div>
        </main>
    );
}
