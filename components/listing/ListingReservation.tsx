"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import Calendar from "../inputs/Calendar";
import TimeSlotPicker from "../inputs/TimeSlotPicker";

type TimeHM = `${number}${number}:${number}${number}`;
type TimeLabel = string;
type ReservationOperationalTimings = {
  operationalHours?: { start?: string; end?: string };
  operationalDays?: { start?: string; end?: string };
};

type Props = {
  listingId: string;
  price: number;
  totalPrice: number;
  addons: number;
  platformFee: number;
  time: number;
  setSelectDate: (value: Date) => void;
  selectedDate: Date;
  setSelectTimeSlots: (value: [TimeLabel | null, TimeLabel | null]) => void;
  selectedTime: [TimeLabel, TimeLabel];
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  disabledStartTimes: readonly TimeHM[];
  disabledEndTimes: readonly TimeHM[];
  operationalTimings: ReservationOperationalTimings;
  instantBooking: number;
  selectedAddons?: any[];
};

function ListingReservation({
  listingId,
  price,
  addons,
  platformFee,
  time,
  setSelectDate,
  selectedDate,
  disabled = false,
  disabledDates,
  setSelectTimeSlots,
  disabledStartTimes,
  disabledEndTimes,
  operationalTimings,
  instantBooking,
  selectedAddons = [],
}: Props) {
  const [localTimes, setLocalTimes] = useState<{ start: TimeLabel | null; end: TimeLabel | null }>({ start: null, end: null });
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [hasPickedTime, setHasPickedTime] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const picked = Boolean(localTimes.start && localTimes.end);
    setHasPickedTime(picked);
    setSelectTimeSlots([localTimes.start, localTimes.end]);
  }, [localTimes.start, localTimes.end, setSelectTimeSlots]);

  const safeHours = Number.isFinite(time) && time > 0 ? time : 0;
  const bookingFee = useMemo(() => price * safeHours, [price, safeHours]);
  const computedTotal = useMemo(
    () => bookingFee + (addons || 0) + (platformFee || 0),
    [bookingFee, addons, platformFee]
  );

  const ready = useMemo(
    () => !disabled && hasPickedDate && hasPickedTime && !isPaying,
    [disabled, hasPickedDate, hasPickedTime, isPaying]
  );

  const handleTimeSelect = useCallback((value: TimeLabel | null, field: "start" | "end") => {
    setErr(null);
    setLocalTimes((prev) => (field === "start" ? { start: value, end: null } : { ...prev, end: value }));
  }, []);

  const inr = useMemo(
    () => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
    []
  );

  const handleReserve = useCallback(async () => {
    if (!ready) return;

    if (!listingId || !selectedDate || !localTimes.start || !localTimes.end) {
      setErr("Please select a valid date and time range.");
      return;
    }

    setIsPaying(true);
    setErr(null);

    try {

      const payload = {
        listingId,
        startDate: selectedDate.toISOString(),
        startTime: localTimes.start,
        endTime: localTimes.end,
        totalPrice: Math.round(computedTotal),
        selectedAddons,
        instantBooking: Number(instantBooking) === 1 ? 1 : 0,
      };

      const res = await fetch("/api/payments/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to initiate payment");

      const redirectUrl: string | undefined = j?.redirectUrl || j?.data?.redirectUrl;
      if (!redirectUrl) throw new Error("Payment gateway did not return a redirect URL.");

      window.location.assign(redirectUrl);
    } catch (e: any) {
      if (mountedRef.current) {
        setErr(e?.message || "Payment initiation failed. Please try again.");
        setIsPaying(false);
      }
    }
  }, [ready, listingId, selectedDate, localTimes.start, localTimes.end, computedTotal, selectedAddons, instantBooking]);

  return (
    <section
      className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
      role="region"
      aria-labelledby="reservation-title"
      data-component="ListingReservation"
    >
      {/* Title / Rate */}
      <div className="flex flex-row items-center gap-1 p-4">
        <p className="flex gap-1 text-2xl font-semibold" id="reservation-title">
          {inr.format(price)} <span className="text-neutral-600 font-normal">/ hour</span>
        </p>
      </div>

      <hr />

      {/* Calendar */}
      <div className="p-4 pb-0 flex flex-row items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id="reservation-date-label">Select Date for Booking</h2>
      </div>

      <Calendar
        value={selectedDate}
        disabledDates={disabledDates}
        allowedDays={[
          (operationalTimings.operationalDays?.start ?? "") as string,
          (operationalTimings.operationalDays?.end ?? "") as string,
        ]}
        onChange={(value: Date) => {
          if (value instanceof Date && !Number.isNaN(value.getTime())) {
            setSelectDate(value);
            setHasPickedDate(true);
            setErr(null);
          }
        }}
        aria-labelledby="reservation-date-label"
      />

      <hr />

      {/* Time Slots */}
      <div className="p-4 pb-0 flex flex-row items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id="reservation-time-label">Pick your Time Slot</h2>
      </div>

      <TimeSlotPicker
        onTimeSelect={handleTimeSelect}
        selectedStart={localTimes.start}
        selectedEnd={localTimes.end}
        disabledStartTimes={disabledStartTimes}
        disabledEndTimes={disabledEndTimes}
        selectedDate={selectedDate}
        operationalTimings={operationalTimings}
        aria-labelledby="reservation-time-label"
      />

      <hr />

      {/* Reserve & Pay */}
      <div className="p-4">
        <button
          type="button"
          disabled={!ready}
          aria-disabled={!ready}
          className={`rounded-xl w-full text-white transition-opacity py-3 ${ready ? "bg-black hover:opacity-90" : "bg-neutral-400 cursor-not-allowed"}`}
          onClick={handleReserve}
          data-testid="reserve-pay-btn"
        >
          {isPaying ? "Redirecting to PhonePe…" : "Reserve and Pay"}
        </button>
        {!!err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
      </div>

      <hr />

      {/* Price Breakdown */}
      <div className="p-4 flex flex-col text-neutral-600 gap-1" aria-live="polite">
        <div className="flex justify-between">
          <p>Base booking fee {inr.format(price)} × {safeHours} hr{safeHours === 1 ? "" : "s"}</p>
          <p>{inr.format(bookingFee)}</p>
        </div>
        <div className="flex justify-between">
          <p>Addons</p>
          <p>{inr.format(addons || 0)}</p>
        </div>
        <div className="flex justify-between pb-3">
          <p>Platform fee</p>
          <p><s className="mr-2">{inr.format(100)}</s>{inr.format(platformFee || 0)}</p>
        </div>
        <hr />
        <div className="flex justify-between pt-4 text-black">
          <p className="font-semibold">Total</p>
          <p className="font-semibold">{inr.format(computedTotal)}</p>
        </div>
      </div>
    </section>
  );
}

export default React.memo(ListingReservation);
