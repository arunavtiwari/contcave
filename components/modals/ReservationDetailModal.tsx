"use client";

import React from "react";
import Modal from "@/components/modals/Modal";
import BookingBreakdown from "@/components/listing/BookingBreakdown";
import { SafeReservation } from "@/types/reservation";

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: SafeReservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({
    isOpen,
    onClose,
    reservation,
}) => {
    if (!reservation) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onClose}
            title="Booking Information"
            actionLabel="Close"
            body={
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground mb-2">
                        Detailed breakdown for booking ID: <span className="font-mono text-foreground">{reservation.bookingId || reservation.id}</span>
                    </p>
                    <BookingBreakdown reservation={reservation} />
                </div>
            }
        />
    );
};

export default React.memo(ReservationDetailModal);
