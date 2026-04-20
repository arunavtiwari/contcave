"use client";

import { Cashfree, load } from "@cashfreepayments/cashfree-js";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaBolt } from "react-icons/fa";

import { updateUser } from "@/app/actions/updateUser";
import Calendar from "@/components/inputs/Calendar";
import TimeSlotPicker from "@/components/inputs/TimeSlotPicker";
import BookingSummaryModal from "@/components/modals/BookingSummaryModal";
import PhoneModal from "@/components/modals/PhoneModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import useLoginModal from "@/hooks/useLoginModal";
import { normalizePhone } from "@/lib/phone";
import { Package } from "@/types/package";
import {
  DayKey,
  OperationalDays,
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
} from "@/types/scheduling";
import {
  AdditionalSetPricingType,
  ListingSet,
  SetPricingResult,
} from "@/types/set";

interface SafeReservation {
  startDate: Date | string;
  startTime: string;
  endTime: string;
  setIds?: string[];
}

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

type LocalTimes = { start: TimeLabel | null; end: TimeLabel | null };

type Props = {
  listingId: string;
  price: number;
  totalPrice?: number;
  platformFee?: number;
  time: number;
  setSelectDateAction: (value: Date | null) => void;
  selectedDate: Date | null;
  setSelectTimeSlotsAction: (value: [TimeLabel | null, TimeLabel | null]) => void;
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
  reservations?: SafeReservation[];

  selectedPackage?: Package | null;


  hasSets?: boolean;
  sets?: ListingSet[];

  additionalSetPricingType?: AdditionalSetPricingType | null;


  selectedSetIds?: string[];
  pricingResult?: SetPricingResult | null;

  selectedPackageId?: string | null;
  setSelectionError?: string | null;
};

let cashfreePromise: Promise<Cashfree | null> | null = null;
function getCashfree(mode: "sandbox" | "production") {
  if (!cashfreePromise) {
    cashfreePromise = load({ mode });
  }
  return cashfreePromise;
}

const clampRound = (n: number) => Math.max(0, Math.round(n || 0));
const GST_RATE = 0.18;
const isValidDate = (d: unknown): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

function hoursToMinutes(h?: number, fallbackMinutes = 90) {
  const n = Number(h);
  if (!Number.isFinite(n) || n <= 0) return fallbackMinutes;
  return Math.max(0, Math.round(n * 60));
}


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
  listingId,
  price,
  totalPrice,
  platformFee = 0,
  time,
  setSelectDateAction,
  selectedDate,
  setSelectTimeSlotsAction,
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

  selectedPackage = null,

  hasSets = false,

  additionalSetPricingType = null,

  selectedSetIds = [],
  pricingResult = null,

  selectedPackageId = null,
  setSelectionError = null,

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
    setSelectTimeSlotsAction([ltStart, ltEnd]);
  }, [ltStart, ltEnd, setSelectTimeSlotsAction]);

  const safeHours = useMemo(
    () => (Number.isFinite(time) && time > 0 ? time : 0),
    [time]
  );

  const bookingFee = useMemo(() => {
    if (selectedPackage) return Number(selectedPackage.offeredPrice || 0);
    if (hasSets && pricingResult) return pricingResult.subtotal;
    return price * safeHours;
  }, [selectedPackage, hasSets, pricingResult, price, safeHours]);

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

  const gstAmount = useMemo(
    () => clampRound(computedTotal * GST_RATE),
    [computedTotal]
  );

  const finalTotal = useMemo(() => {
    if (typeof totalPrice === "number") {
      return clampRound(totalPrice);
    }
    return clampRound(computedTotal + gstAmount);
  }, [totalPrice, computedTotal, gstAmount]);

  const hasValidTime = useMemo(
    () => Boolean(localTimes.start && localTimes.end),
    [localTimes.start, localTimes.end]
  );

  const setValidation = useMemo(() => {
    if (!hasSets) return { valid: true };
    return { valid: !setSelectionError, error: setSelectionError };
  }, [hasSets, setSelectionError]);

  const ready = useMemo(
    () =>
      !disabled &&
      hasPickedDate &&
      hasValidTime &&
      !isPaying &&
      setValidation.valid,
    [disabled, hasPickedDate, hasValidTime, isPaying, setValidation.valid]
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
      await updateUser({ phone: normalized });
      setCustomerPhone(normalized);
      setShowPhoneModal(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unable to save phone. Try again.";
      setPhoneError(msg);
    } finally {
      setPhoneSaving(false);
    }
  }, [phoneInput]);

  const startPayment = useCallback(
    async (controller: AbortController, gst?: GSTDetails) => {
      if (!listingId || !selectedDate || !localTimes.start || !localTimes.end)
        return;
      const startDateStr = formatLocalYmd(selectedDate);

      interface PaymentPayload {
        listingId: string;
        startDate: string;
        startTime: string;
        endTime: string;
        totalPrice: number;
        selectedAddons: Addon[];
        instantBooking: boolean;
        gstDetails?: GSTDetails;
        selectedPackage?: {
          title: string;
          offeredPrice: number;
          durationHours: number;
        };
      }

      const payload: PaymentPayload = {
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

      if (hasSets && pricingResult) {
        (payload as PaymentPayload & { setIds?: string[]; setPackageId?: string | null; pricingSnapshot?: unknown }).setIds = selectedSetIds;
        (payload as PaymentPayload & { setIds?: string[]; setPackageId?: string | null; pricingSnapshot?: unknown }).setPackageId = selectedPackageId;
        (payload as PaymentPayload & { setIds?: string[]; setPackageId?: string | null; pricingSnapshot?: unknown }).pricingSnapshot = pricingResult.breakdown;
      }

      const res = await fetch("/api/payments/cashfree/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { paymentSessionId?: string; mode?: "sandbox" | "production" };
        message?: string;
        error?: string;
      };

      const sessionId = j?.data?.paymentSessionId;
      const mode = j?.data?.mode || "sandbox";

      if (!res.ok || !sessionId)
        throw new Error(j?.error || j?.message || "Failed to create reservation");

      const cf = await getCashfree(mode);
      if (!cf) throw new Error("Unable to initialize payment gateway");
      await cf.checkout({
        paymentSessionId: sessionId,
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
      hasSets,
      pricingResult,
      selectedSetIds,
      selectedPackageId,
    ]
  );

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
    <section className="bg-background rounded-xl shadow-sm border border-border/10 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <p
          className="flex gap-1 text-2xl font-semibold"
          id={`${sectionId}-title`}
        >
          {selectedPackage
            ? INR.format(Number(selectedPackage.offeredPrice || 0))
            : INR.format(price)}{" "}
          <span className="text-muted-foreground font-normal">
            {selectedPackage ? " (package)" : "/ hour"}
          </span>
        </p>

        <Pill
          label={instantBooking ? "Instant Book" : "Request to Book"}
          variant="subtle"
          color={instantBooking ? "success" : "warning"}
          icon={instantBooking ? FaBolt : undefined}
          size="xs"
        />
      </div>

      <hr />
      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <Heading
          title="Select Date for Booking"
          variant="h6"
          id={`${sectionId}-date-label`}
        />
      </div>
      <Calendar
        value={selectedDate ?? null}
        disabledDates={disabledDates}
        allowedDays={allowedDays}
        onChange={(value) => {
          if (isValidDate(value)) {
            setSelectDateAction(value);
            setHasPickedDate(true);
            setErr(null);
          } else {
            setSelectDateAction(null);
            setHasPickedDate(false);
          }
        }}
        aria-labelledby={`${sectionId}-date-label`}
      />
      <hr />
      <hr />
      {hasSets && (
        <>
          <div className="p-4">
            {!setValidation.valid && selectedSetIds.length > 0 && (
              <p className="mt-2 text-sm text-destructive">{setValidation.error}</p>
            )}
          </div>
          <hr />
        </>
      )}
      <div className="p-4 pb-0 flex items-center justify-between font-semibold text-lg">
        <Heading
          title="Pick your Time Slot"
          variant="h6"
          id={`${sectionId}-time-label`}
        />
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

      <div className="p-4">
        <Button
          label={isPaying ? "Redirecting to Cashfreeâ€¦" : "Reserve and Pay"}
          onClick={handleReserve}
          disabled={!ready}
          loading={isPaying}
          rounded
          classNames="font-bold text-base py-4"
        />
        {!!err && (
          <p className="mt-4 text-sm text-destructive font-medium bg-destructive/5 p-3 rounded-lg border border-destructive/10" role="alert">
            {err}
          </p>
        )}
      </div>

      <hr />
      <div className="p-4 flex flex-col text-muted-foreground gap-1.5" aria-live="polite">
        <div className="flex justify-between">
          {selectedPackage ? (
            <p>Package: {selectedPackage.title}</p>
          ) : hasSets && pricingResult ? (
            <div className="flex-1">
              <p>Base booking ({pricingResult.breakdown.includedSetName})</p>
              {pricingResult.breakdown.additionalSets.map((s) => (
                <p key={s.id} className="text-sm text-muted-foreground">
                  + {s.name} ({additionalSetPricingType === "HOURLY" ? `${INR.format(s.price)}/hr` : INR.format(s.price)})
                </p>
              ))}
              {pricingResult.breakdown.packageTitle && (
                <p className="text-sm text-muted-foreground">
                  + Package: {pricingResult.breakdown.packageTitle}
                </p>
              )}
            </div>
          ) : (
            <p>
              Base booking fee {INR.format(price)} Ãƒâ€” {safeHours} hr
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
        <div className="flex justify-between pb-3 text-foreground">
          <p className="font-medium">GST (18%)</p>
          <p className="font-medium">{INR.format(gstAmount)}</p>
        </div>
        <hr />
        <div className="flex justify-between pt-4 text-foreground">
          <p className="font-semibold">Total</p>
          <p className="font-semibold">{INR.format(finalTotal)}</p>
        </div>
      </div>

      <PhoneModal
        isOpen={showPhoneModal}
        phoneInput={phoneInput}
        phoneError={phoneError}
        phoneSaving={phoneSaving}
        setPhoneInputAction={setPhoneInput}
        setPhoneErrorAction={setPhoneError}
        onCloseAction={() => setShowPhoneModal(false)}
        onSubmitAction={submitPhone}
      />

      <BookingSummaryModal
        isOpen={showSummaryModal}
        onCloseAction={() => setShowSummaryModal(false)}
        onConfirmAction={handleConfirmModal}
        finalTotal={finalTotal}
        bookingFee={bookingFee}
        addonsSum={addonsSum}
        platformFee={platformFee || 0}
        gstAmount={gstAmount}
        subTotal={computedTotal}
        gstDetails={gstDetails}
        setGstDetailsAction={setGstDetails}
        reservationId={""}
        transactionId={""} />
    </section>
  );
}

