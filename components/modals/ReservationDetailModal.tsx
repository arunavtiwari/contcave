"use client";

import React from "react";

import BookingBreakdown from "@/components/listing/BookingBreakdown";
import Modal from "@/components/modals/Modal";
import { SafeReservation } from "@/types/reservation";

interface ReservationDetailModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    reservation: SafeReservation | null;
    showClient?: boolean;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({
    isOpen,
    onCloseAction,
    reservation,
    showClient = false,
}) => {
    if (!reservation) return null;

    const details = [
        showClient ? { label: "Client", value: reservation.guestName || "Guest" } : null,
        { label: "Pax", value: reservation.pax ? String(reservation.pax) : "Not provided" },
        reservation.shootType ? { label: "Shoot type", value: reservation.shootType } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);

    return (
        <Modal
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            title="Booking Information"
            body={
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground mb-2">
                        Detailed breakdown for booking ID: <span className="font-mono text-foreground">{reservation.bookingId || reservation.id}</span>
                    </p>
                    <dl className="mb-2 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3">
                        {details.map((item) => (
                            <div key={item.label} className="min-w-0">
                                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                                <dd className="truncate text-sm font-medium text-foreground" title={item.value}>{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <BookingBreakdown reservation={reservation} />
                </div>
            }
        />
    );
};

export default React.memo(ReservationDetailModal);
