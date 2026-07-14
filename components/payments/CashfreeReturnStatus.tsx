import getReservation from "@/app/actions/getReservation";
import getTransaction from "@/app/actions/getTransaction";

import CashfreeReturnStatusClient from "./CashfreeReturnStatusClient";

type Search = Record<string, string | string[] | undefined>;

const pickFirst = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : value?.[0] ?? "";

export default async function CashfreeReturnStatus({ searchParams }: { searchParams: Search }) {
    const tid = pickFirst(searchParams.order_id ?? searchParams.tid);

    if (!tid) {
        return (
            <main className="max-w-xl mx-auto p-6">
                <h1 className="text-3xl font-bold text-foreground">Your Reservation</h1>
                <p className="mt-4 text-xl text-destructive font-medium">
                    Missing <code>order_id</code> or <code>tid</code> in URL.
                </p>
            </main>
        );
    }

    const transaction = await getTransaction({ tid });
    const reservation = transaction?.reservation ?? (await getReservation({ tid }));

    const txStatus = String(transaction?.status ?? "PENDING").toUpperCase();
    const listingId =
        reservation?.listing?.id ||
        reservation?.listingId ||
        transaction?.listing?.id ||
        transaction?.listingId ||
        "";

    const serializedReservation = reservation;

    return (
        <CashfreeReturnStatusClient
            tid={tid}
            listingId={listingId}
            initialStatus={txStatus}
            initialReservation={serializedReservation}
        />
    );
}
