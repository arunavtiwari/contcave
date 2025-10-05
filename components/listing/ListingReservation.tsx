"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Calendar from "../inputs/Calendar";
import TimeSlotPicker from "../inputs/TimeSlotPicker";
import { load, Cashfree } from "@cashfreepayments/cashfree-js";
import {
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
  DayKey,
  OperationalDays,
} from "@/types/scheduling";
import useLoginModal from "@/hook/useLoginModal";
import PhoneModal from "@/components/modals/PhoneModal";
import BookingSummaryModal from "../modals/BookingSummaryModal";
import { normalizePhone } from "@/lib/phone";
import { Package } from "../inputs/PackagesForm";
import { SafeUser } from "@/types";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Addon = { price: number; qty?: number };

type GSTDetails = {
  companyName: string;
  gstin: string;
  billingAddress: string;
};

type Props = {
  user: SafeUser;
  listingId: string;
  price: number;
  totalPrice?: number;
  platformFee?: number;
  time: number;
  setSelectDate: (value: Date | null) => void;
  selectedDate: Date | null;
  setSelectTimeSlots: (value: [TimeLabel | null, TimeLabel | null]) => void;
  selectedTime: [TimeLabel | null, TimeLabel | null];
  disabled?: boolean;
  disabledDates: Date[];
  disabledStartTimes: readonly TimeHM[];
  disabledEndTimes: readonly TimeHM[];
  operationalTimings: ReservationOperationalTimings;
  instantBooking: boolean;
  selectedAddons?: Addon[];
  currentUserPhone?: string | null;
  isAuthenticated: boolean;
  minBookingHours?: number;
  isOwner?: boolean;
  selectedPackage?: Package | null;
};

type LocalTimes = { start: TimeLabel | null; end: TimeLabel | null };

let cashfreePromise: Promise<Cashfree | null> | null = null;
function getCashfree() {
  if (!cashfreePromise) {
    const mode =
      (process.env.NEXT_PUBLIC_CASHFREE_ENV || "sandbox").toLowerCase() ===
        "production"
        ? "production"
        : "sandbox";
    cashfreePromise = load({ mode });
  }
  return cashfreePromise;
}

const clampRound = (n: number) => Math.max(0, Math.round(n || 0));
const isValidDate = (d: unknown): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

function hoursToMinutes(h?: number, fallbackMinutes = 90) {
  const n = Number(h);
  if (!Number.isFinite(n) || n <= 0) return fallbackMinutes;
  return Math.max(0, Math.round(n * 60));
}

/* Helpers to parse/format 12-hour labels like "2:30 PM" */
const parseLabel = (label: string) => {
  const m = label.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (!m) return { hours: 0, minutes: 0 };
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { hours: h, minutes: min };
};

const formatLabel = (d: Date): TimeLabel => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}` as TimeLabel;
};

export default function ListingReservation({
  user,
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
  currentUserPhone = null,
  isAuthenticated,
  minBookingHours,
  isOwner = false,
  selectedPackage = null,
}: Props) {
  const loginModel = useLoginModal();

  const [localTimes, setLocalTimes] = useState<LocalTimes>({
    start: selectedTime?.[0] ?? null,
    end: selectedTime?.[1] ?? null,
  });
  const [hasPickedDate, setHasPickedDate] = useState<boolean>(
    Boolean(selectedDate)
  );
  const [isPaying, setIsPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUserPhone ?? "");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>(
    currentUserPhone ?? ""
  );
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [gstDetails, setGstDetails] = useState<GSTDetails>({
    companyName: "",
    gstin: "",
    billingAddress: "",
  });

  const mountedRef = useRef(true);
  const inflight = useRef<AbortController | null>(null);
  const sectionId = useId();

  /* If a package is selected and user chooses a start time, auto-calc end time */
  const selectedStartLabel = selectedTime?.[0];
  useEffect(() => {
    if (selectedPackage && selectedStartLabel && selectedDate) {
      const startLabel = selectedStartLabel;
      const { hours, minutes } = parseLabel(startLabel!);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(
        endDate.getHours() + Number(selectedPackage.durationHours || 0)
      );
      const endLabel = formatLabel(endDate);

      setLocalTimes({ start: startLabel, end: endLabel });
    }
  }, [selectedPackage, selectedStartLabel, selectedDate]);

  const selStart = (selectedTime?.[0] as TimeLabel | null) ?? null;
  const selEnd = (selectedTime?.[1] as TimeLabel | null) ?? null;
  useEffect(() => {
    setLocalTimes({ start: selStart, end: selEnd });
  }, [selStart, selEnd]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inflight.current?.abort();
    };
  }, []);

  const ltStart = localTimes.start;
  const ltEnd = localTimes.end;
  useEffect(() => {
    setSelectTimeSlots([ltStart, ltEnd]);
  }, [ltStart, ltEnd, setSelectTimeSlots]);

  const safeHours = useMemo(
    () => (Number.isFinite(time) && time > 0 ? time : 0),
    [time]
  );

  const bookingFee = useMemo(() => {
    if (selectedPackage) return Number(selectedPackage.offeredPrice || 0);
    return price * safeHours;
  }, [selectedPackage, price, safeHours]);

  const addonsSum = useMemo(
    () =>
      (selectedAddons || []).reduce((sum, a) => {
        const p = Math.max(0, Number(a?.price) || 0);
        const q = Math.max(0, Number(a?.qty ?? 0));
        return sum + p * q;
      }, 0),
    [selectedAddons]
  );

  const computedTotal = useMemo(
    () => clampRound(bookingFee + addonsSum + clampRound(platformFee || 0)),
    [bookingFee, addonsSum, platformFee]
  );

  const finalTotal = useMemo(
    () => clampRound(typeof totalPrice === "number" ? totalPrice : computedTotal),
    [totalPrice, computedTotal]
  );

  const hasValidTime = useMemo(
    () => Boolean(localTimes.start && localTimes.end),
    [localTimes.start, localTimes.end]
  );

  const ready = useMemo(
    () => !disabled && hasPickedDate && hasValidTime && !isPaying,
    [disabled, hasPickedDate, hasValidTime, isPaying]
  );

  const minBookingMinutes = useMemo(
    () => hoursToMinutes(minBookingHours, 90),
    [minBookingHours]
  );

  const handleTimeSelect = useCallback(
    (value: TimeLabel | null, field: "start" | "end") => {
      setErr(null);
      if (selectedPackage && field === "start") {
        setLocalTimes({ start: value, end: null });
        return;
      }
      setLocalTimes((prev) =>
        field === "start" ? { start: value, end: null } : { ...prev, end: value }
      );
    },
    [selectedPackage]
  );

  const allowedDays = useMemo<OperationalDays | DayKey[] | undefined>(
    () => operationalTimings.operationalDays,
    [operationalTimings.operationalDays]
  );

  const formatLocalYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const ensurePhone = useCallback(() => {
    const n = normalizePhone(customerPhone);
    if (!n) {
      setPhoneInput("");
      setPhoneError(null);
      setShowPhoneModal(true);
      return false;
    }
    return true;
  }, [customerPhone]);

  const submitPhone = useCallback(async () => {
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneSaving(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to save phone");
      }
      setCustomerPhone(normalized);
      setShowPhoneModal(false);
    } catch (e: any) {
      setPhoneError(e?.message || "Unable to save phone. Try again.");
    } finally {
      setPhoneSaving(false);
    }
  }, [phoneInput]);

  const startPayment = useCallback(
    async (controller: AbortController, gst?: GSTDetails) => {
      if (!listingId || !selectedDate || !localTimes.start || !localTimes.end)
        return;
      const startDateStr = formatLocalYmd(selectedDate);
      const payload: any = {
        listingId,
        startDate: startDateStr,
        startTime: localTimes.start,
        endTime: localTimes.end,
        totalPrice: finalTotal,
        selectedAddons,
        instantBooking: !!instantBooking,
        gstDetails: gst, 
      };

      if (selectedPackage) {
        payload.selectedPackage = {
          title: selectedPackage.title,
          offeredPrice: selectedPackage.offeredPrice,
          durationHours: selectedPackage.durationHours,
        };
      }

      const res = await fetch("/api/payments/cashfree/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const j = (await res.json().catch(() => ({}))) as {
        paymentSessionId?: string;
        message?: string;
      };
      if (!res.ok || !j?.paymentSessionId)
        throw new Error(j?.message || "Failed to create reservation");
      const cf = await getCashfree();
      if (!cf) throw new Error("Unable to initialize payment gateway");
      await cf.checkout({
        paymentSessionId: j.paymentSessionId,
        redirectTarget: "_self",
      });
    },
    [
      listingId,
      selectedDate,
      localTimes.start,
      localTimes.end,
      finalTotal,
      selectedAddons,
      instantBooking,
      selectedPackage,
    ]
  );

  // handleReserve now shows the BookingSummaryModal first
  const handleReserve = useCallback(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      loginModel.onOpen();
      return;
    }
    if (!ensurePhone()) return;

    setShowSummaryModal(true);
  }, [ready, isAuthenticated, loginModel, ensurePhone]);

  const handleConfirmModal = useCallback(() => {
    setShowSummaryModal(false);
    setIsPaying(true);
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    startPayment(controller, gstDetails).catch((e) => {
      if (mountedRef.current && e?.name !== "AbortError") {
        setErr(e?.message || "Payment initiation failed. Please try again.");
        setIsPaying(false);
      }
    });
  }, [gstDetails, startPayment]);

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-1 p-4">
        <p className="flex gap-1 text-2xl font-semibold" id={`${sectionId}-title`}>
          {selectedPackage ? INR.format(Number(selectedPackage.offeredPrice || 0)) : INR.format(price)}{" "}
          <span className="text-neutral-600 font-normal">{selectedPackage ? " (package)" : "/ hour"}</span>
        </p>
      </div>
      <hr />
      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id={`${sectionId}-date-label`}>
          Select Date for Booking
        </h2>
      </div>
      <Calendar
        value={selectedDate ?? null}
        disabledDates={disabledDates}
        allowedDays={allowedDays}
        onChange={(value) => {
          if (isValidDate(value)) {
            setSelectDate(value);
            setHasPickedDate(true);
            setErr(null);
          } else {
            setSelectDate(null);
            setHasPickedDate(false);
          }
        }}
        aria-labelledby={`${sectionId}-date-label`}
      />
      <hr />
      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <h2 className="text-lg" id={`${sectionId}-time-label`}>
          Pick your Time Slot
        </h2>
      </div>
      <TimeSlotPicker
        onTimeSelect={handleTimeSelect}
        selectedStart={localTimes.start}
        selectedEnd={localTimes.end}
        disabledStartTimes={disabledStartTimes}
        disabledEndTimes={disabledEndTimes}
        selectedDate={selectedDate ?? null}
        operationalTimings={operationalTimings}
        aria-labelledby={`${sectionId}-time-label`}
        minBookingMinutes={minBookingMinutes}
      />
      <hr />
      {true && (
        <div className="p-4">
          <button
            type="button"
            disabled={!ready}
            className={`rounded-xl w-full text-white transition-opacity py-3 ${ready ? "bg-black hover:opacity-90" : "bg-neutral-400 cursor-not-allowed"}`}
            onClick={handleReserve}
          >
            {isPaying ? "Redirecting to Cashfree…" : "Reserve and Pay"}
          </button>
          {!!err && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {err}
            </p>
          )}
        </div>
      )}
      <hr />
      <div className="p-4 flex flex-col text-neutral-600 gap-1" aria-live="polite">
        <div className="flex justify-between">
          {selectedPackage ? (
            <p>Package: {selectedPackage.title}</p>
          ) : (
            <p>
              Base booking fee {INR.format(price)} × {safeHours} hr
              {safeHours === 1 ? "" : "s"}
            </p>
          )}
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

      <PhoneModal
        isOpen={showPhoneModal}
        phoneInput={phoneInput}
        phoneError={phoneError}
        phoneSaving={phoneSaving}
        setPhoneInput={setPhoneInput}
        setPhoneError={setPhoneError}
        onClose={() => setShowPhoneModal(false)}
        onSubmit={submitPhone}
      />

      <BookingSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onConfirm={handleConfirmModal}
        finalTotal={finalTotal}
        bookingFee={bookingFee}
        addonsSum={addonsSum}
        platformFee={platformFee || 0}
        gstDetails={gstDetails}
        setGstDetails={setGstDetails} 
        currentUserId={user.id}      />
    </section>
  );
}
