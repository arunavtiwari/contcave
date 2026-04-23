"use client";

import React, { useMemo } from "react";

import {
    calculateDurationHours,
    formatBookingDate,
    formatTimeString,
    normalizeAddons
} from "@/lib/chat/bookingDisplay";
import { SafeReservation } from "@/types/reservation";

interface BookingBreakdownProps {
    reservation: SafeReservation;
}

const BookingBreakdown: React.FC<BookingBreakdownProps> = ({ reservation }) => {
    const addons = useMemo(() => normalizeAddons(reservation.selectedAddons), [reservation.selectedAddons]);
    const _breakdown = (reservation.pricingSnapshot as Record<string, unknown>) || {};
    const addonsCharge = useMemo(() => addons.reduce((acc, value) => acc + value.qty * value.price, 0), [addons]);
    const duration = useMemo(() => calculateDurationHours(reservation.startTime, reservation.endTime), [reservation.startTime, reservation.endTime]);
    const propertyCharge = useMemo(() => Math.max(0, (reservation.totalPrice || 0) - addonsCharge), [reservation.totalPrice, addonsCharge]);
    const bookingDateLabel = useMemo(() => formatBookingDate(reservation.startDate.toISOString()), [reservation.startDate]);

    const bookingTimeLabel = useMemo(() =>
        reservation.startTime && reservation.endTime
            ? `${formatTimeString(reservation.startTime)} – ${formatTimeString(reservation.endTime)}`
            : "—"
        , [reservation.startTime, reservation.endTime]);

    return (
        <div className="mt-4 flex flex-col gap-3 text-sm py-4 border-t border-border/50">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <span className="text-muted-foreground">Date of booking:</span>
                <span className="text-right font-bold text-foreground">{bookingDateLabel}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <span className="text-muted-foreground">Time:</span>
                <span className="text-right font-bold text-foreground">{bookingTimeLabel}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-right font-bold text-foreground">
                    {duration > 0 ? `${duration} hours` : "—"}
                </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <span className="text-muted-foreground">Add-ons:</span>
                <span className="text-right font-bold text-foreground">
                    {addons.length > 0 ? addons.map((item) => item.name).join(", ") : "None"}
                </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-border/40 pt-3">
                <span className="text-muted-foreground">Add-ons Charge:</span>
                <span className="text-right font-bold text-foreground">₹ {addonsCharge}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <span className="text-muted-foreground">Property Charge:</span>
                <span className="text-right font-bold text-foreground">
                    ₹ {propertyCharge}
                </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-border pt-3">
                <span className="font-bold text-foreground">Total:</span>
                <span className="text-right font-bold text-foreground">₹ {reservation.totalPrice}</span>
            </div>
        </div>
    );
};

export default React.memo(BookingBreakdown);
