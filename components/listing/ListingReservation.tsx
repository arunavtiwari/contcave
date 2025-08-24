"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Calendar from "../inputs/Calendar";
import TimeSlotPicker from "../inputs/TimeSlotPicker";
import { load, Cashfree } from "@cashfreepayments/cashfree-js";
import { ReservationOperationalTimings, TimeHM, TimeLabel, DayKey } from "@/types/scheduling";

const IST_TIMEZONE = "Asia/Kolkata";
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

type Props = {
  listingId: string;
  price: number;
  totalPrice?: number;
  platformFee?: number;
  time: number;
  setSelectDate: (value: Date) => void;
  selectedDate: Date;
  setSelectTimeSlots: (value: [TimeLabel | null, TimeLabel | null]) => void;
  selectedTime: [TimeLabel, TimeLabel] | [TimeLabel | null, TimeLabel | null];
  disabled?: boolean;
  disabledDates: Date[];
  disabledStartTimes: readonly TimeHM[];
  disabledEndTimes: readonly TimeHM[];
  operationalTimings: ReservationOperationalTimings;
  instantBooking: boolean;
  selectedAddons?: Array<{ price: number; qty?: number }>;
};

type LocalTimes = { start: TimeLabel | null; end: TimeLabel | null };

let cashfreePromise: Promise<Cashfree | null> | null = null;
function getCashfree() {
  if (!cashfreePromise) {
    const mode = (process.env.NEXT_PUBLIC_CASHFREE_ENV || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
    cashfreePromise = load({ mode });
  }
  return cashfreePromise;
}

const clampRound = (n: number) => Math.max(0, Math.round(n || 0));

export default function ListingReservation({
  listingId,
  price,
  totalPrice,
  platformFee = 0,
  time,
  setSelectDate,
  selectedDate,
  setSelectTimeSlots,
  selectedTime,
  disabled = false,
  disabledDates,
  disabledStartTimes,
  disabledEndTimes,
  operationalTimings,
  instantBooking,
  selectedAddons = [],
}: Props) {
  const [localTimes, setLocalTimes] = useState<LocalTimes>({ start: selectedTime?.[0] ?? null, end: selectedTime?.[1] ?? null });
  const [hasPickedDate, setHasPickedDate] = useState(Boolean(selectedDate));
  const [isPaying, setIsPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const inflight = useRef<AbortController | null>(null);
  const sectionId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inflight.current?.abort();
    };
  }, []);

  useEffect(() => {
    setSelectTimeSlots([localTimes.start, localTimes.end]);
  }, [localTimes.start, localTimes.end, setSelectTimeSlots]);

  const safeHours = useMemo(() => (Number.isFinite(time) && time > 0 ? time : 0), [time]);
  const bookingFee = useMemo(() => price * safeHours, [price, safeHours]);

  const addonsSum = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + Math.max(0, Number(a.price) || 0) * Math.max(0, Number(a.qty ?? 0)), 0),
    [selectedAddons]
  );

  const computedTotal = useMemo(
    () => clampRound(bookingFee + addonsSum + clampRound(platformFee || 0)),
    [bookingFee, addonsSum, platformFee]
  );

  const finalTotal = useMemo(() => clampRound(typeof totalPrice === "number" ? totalPrice : computedTotal), [totalPrice, computedTotal]);

  const hasValidTime = useMemo(
    () => Boolean(localTimes.start && localTimes.end),
    [localTimes.start, localTimes.end]
  );

  const ready = useMemo(
    () => !disabled && hasPickedDate && hasValidTime && !isPaying,
    [disabled, hasPickedDate, hasValidTime, isPaying]
  );

  const handleTimeSelect = useCallback((value: TimeLabel | null, field: "start" | "end") => {
    setErr(null);
    setLocalTimes((prev) => (field === "start" ? { start: value, end: null } : { ...prev, end: value }));
  }, []);

  const allowedDays: DayKey[] = useMemo(() => {
    const od = operationalTimings.operationalDays;
    if (!od) return [];
    if ("days" in od && Array.isArray(od.days)) return od.days;
    if ("start" in od && "end" in od) return [od.start, od.end];
    return [];
  }, [operationalTimings.operationalDays]);

  const handleReserve = useCallback(async () => {
    if (!ready || !listingId || !selectedDate || !localTimes.start || !localTimes.end) return;
    setIsPaying(true);
    setErr(null);
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    try {
      const startDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: IST_TIMEZONE }).format(selectedDate);
      const payload = {
        listingId,
        startDate: startDateStr,
        startTime: localTimes.start,
        endTime: localTimes.end,
        totalPrice: finalTotal,
        selectedAddons,
        instantBooking: !!instantBooking,
      };

      const res = await fetch("/api/payments/cashfree/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.paymentSessionId) throw new Error(j?.message || "Failed to create reservation");

      const cf = await getCashfree();
      if (!cf) throw new Error("Unable to initialize payment gateway");
      await cf.checkout({ paymentSessionId: j.paymentSessionId, redirectTarget: "_self" });
    } catch (e: any) {
      if (mountedRef.current && e?.name !== "AbortError") {
        setErr(e?.message || "Payment initiation failed. Please try again.");
        setIsPaying(false);
      }
    }
  }, [ready, listingId, selectedDate, localTimes.start, localTimes.end, finalTotal, selectedAddons, instantBooking]);

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden" role="region" aria-labelledby={`${sectionId}-title`} data-component="ListingReservation">
      <div className="flex items-center gap-1 p-4">
        <p className="flex gap-1 text-2xl font-semibold" id={`${sectionId}-title`}>
          {INR.format(price)} <span className="text-neutral-600 font-normal">/ hour</span>
        </p>
      </div>

      <hr />

      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id={`${sectionId}-date-label`}>Select Date for Booking</h2>
      </div>

      <Calendar
        value={selectedDate}
        disabledDates={disabledDates}
        allowedDays={allowedDays}
        onChange={(value: Date) => {
          if (value instanceof Date && !Number.isNaN(value.getTime())) {
            setSelectDate(value);
            setHasPickedDate(true);
            setErr(null);
          }
        }}
        aria-labelledby={`${sectionId}-date-label`}
      />

      <hr />

      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id={`${sectionId}-time-label`}>Pick your Time Slot</h2>
      </div>

      <TimeSlotPicker
        onTimeSelect={handleTimeSelect}
        selectedStart={localTimes.start}
        selectedEnd={localTimes.end}
        disabledStartTimes={disabledStartTimes}
        disabledEndTimes={disabledEndTimes}
        selectedDate={selectedDate}
        operationalTimings={operationalTimings}
        aria-labelledby={`${sectionId}-time-label`}
      />

      <hr />

      <div className="p-4">
        <button
          type="button"
          disabled={!ready}
          aria-disabled={!ready}
          className={`rounded-xl w-full text-white transition-opacity py-3 ${ready ? "bg-black hover:opacity-90" : "bg-neutral-400 cursor-not-allowed"}`}
          onClick={handleReserve}
          data-testid="reserve-pay-btn"
        >
          {isPaying ? "Redirecting to Cashfree…" : "Reserve and Pay"}
        </button>
        {!!err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
      </div>

      <hr />

      <div className="p-4 flex flex-col text-neutral-600 gap-1" aria-live="polite">
        <div className="flex justify-between">
          <p>Base booking fee {INR.format(price)} × {safeHours} hr{safeHours === 1 ? "" : "s"}</p>
          <p>{INR.format(clampRound(bookingFee))}</p>
        </div>
        <div className="flex justify-between">
          <p>Addons</p>
          <p>{INR.format(clampRound(addonsSum))}</p>
        </div>
        <div className="flex justify-between pb-3">
          <p>Platform fee</p>
          <p>{INR.format(clampRound(platformFee || 0))}</p>
        </div>
        <hr />
        <div className="flex justify-between pt-4 text-black">
          <p className="font-semibold">Total</p>
          <p className="font-semibold">{INR.format(finalTotal)}</p>
        </div>
      </div>
    </section>
  );
}
