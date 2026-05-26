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

    const serializedReservation = reservation
        ? {
              ...reservation,
              startDate: reservation.startDate instanceof Date ? reservation.startDate.toISOString() : reservation.startDate,
              createdAt: reservation.createdAt instanceof Date ? reservation.createdAt.toISOString() : reservation.createdAt,
              updatedAt: reservation.updatedAt instanceof Date ? reservation.updatedAt.toISOString() : reservation.updatedAt,
              markedForDeletionAt: reservation.markedForDeletionAt instanceof Date ? reservation.markedForDeletionAt.toISOString() : reservation.markedForDeletionAt,
              listing: reservation.listing
                  ? {
                        ...reservation.listing,
                        createdAt: reservation.listing.createdAt instanceof Date ? reservation.listing.createdAt.toISOString() : reservation.listing.createdAt,
                    }
                  : null,
          }
        : null;

    return (
        <CashfreeReturnStatusClient
            tid={tid}
            listingId={listingId}
            initialStatus={txStatus}
            initialReservation={serializedReservation}
        />
    );
}
