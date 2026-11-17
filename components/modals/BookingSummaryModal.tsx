"use client";

import Link from "next/link";
import React, { useState } from "react";

import { saveBillingInfo } from "@/app/actions/billingActions";
import Modal from "@/components/modals/Modal";
import Callout from "@/components/ui/Callout";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { formatINR } from "@/lib/utils";
import { billingSchema } from "@/schemas/billing";

type GSTDetails = {
  companyName: string;
  gstin: string;
  billingAddress: string;
};

export type ShootDetails = {
  pax: number;
  shootType?: string;
};

/** Booking without logging in: the details that identify the guest. */
export type GuestCheckoutDetails = {
  name: string;
  phone: string;
  email: string;
  /** GST billing typed at checkout (guests have no saved billing records). */
  billing: GSTDetails | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BookingSummaryModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: (billingDetailId: string | null, shootDetails: ShootDetails, guest?: GuestCheckoutDetails) => void;
  /** Not logged in: collect name, phone and email instead of using an account. */
  isGuest?: boolean;
  /** Switch to logging in instead of booking as a guest. */
  onLoginAction?: () => void;
  maximumPax?: number | null;
  finalTotal: number;
  bookingFee: number;
  addonsSum: number;
  platformFee: number;
  gstAmount: number;
  gstDetails: GSTDetails;
  setGstDetailsAction: (v: GSTDetails) => void;
  instantBooking: boolean;
  contcaveNote?: string | null;
};

export default function BookingSummaryModal({
  isOpen,
  onCloseAction,
  onConfirmAction,
  finalTotal,
  bookingFee,
  addonsSum,
  platformFee,
  gstAmount,
  gstDetails,
  setGstDetailsAction,
  instantBooking,
  contcaveNote,
  maximumPax,
  isGuest = false,
  onLoginAction,
}: BookingSummaryModalProps) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestErrors, setGuestErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [pax, setPax] = useState("");
  const [shootType, setShootType] = useState("");
  const [paxError, setPaxError] = useState<string | null>(null);
  const [needGST, setNeedGST] = useState(false);
  const [agree, setAgree] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validateGuest = (): GuestCheckoutDetails | null => {
    const name = guestName.trim();
    const phone = guestPhone.replace(/\D/g, "").slice(-10);
    const email = guestEmail.trim().toLowerCase();
    const errors: typeof guestErrors = {};
    if (name.length < 2) errors.name = "Enter your name.";
    if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a valid 10-digit mobile number.";
    if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
    setGuestErrors(errors);
    if (Object.keys(errors).length > 0) return null;
    return { name, phone, email, billing: null };
  };

  const handleConfirm = async () => {
    const guest = isGuest ? validateGuest() : null;
    if (isGuest && !guest) return;

    const paxCount = Number(pax);
    if (!Number.isInteger(paxCount) || paxCount < 1) {
      setPaxError("Enter the number of people in the shoot.");
      return;
    }
    if (maximumPax && paxCount > maximumPax) {
      setPaxError(`This studio allows up to ${maximumPax} people.`);
      return;
    }
    setPaxError(null);
    const shootDetails: ShootDetails = { pax: paxCount, shootType: shootType.trim() || undefined };

    setSaving(true);

    if (needGST) {
      const check = billingSchema.pick({ companyName: true, gstin: true, billingAddress: true }).safeParse(gstDetails);

      if (!check.success) {
        setGstError(check.error.issues[0].message);
        setSaving(false);
        return;
      }

      // Guests have no account session to save billing to; it's sent with the payment instead.
      if (guest) {
        setGstDetailsAction({ ...gstDetails });
        onConfirmAction(null, shootDetails, { ...guest, billing: { ...gstDetails } });
        setSaving(false);
        return;
      }

      try {
        const billingRecord = await saveBillingInfo({
          companyName: gstDetails.companyName,
          gstin: gstDetails.gstin,
          billingAddress: gstDetails.billingAddress,
          isDefault: true,
        });

        if (!billingRecord.success || !billingRecord.data) {
          throw new Error(billingRecord.error || "Unable to save billing information");
        }

        setGstDetailsAction({ ...gstDetails });

        onConfirmAction(billingRecord.data.id || null, shootDetails);
      } catch (err: unknown) {
        console.error(err);
        if (err instanceof Error) {
          setGstError(err.message);
        } else {
          setGstError("Something went wrong");
        }
      } finally {
        setSaving(false);
      }
    } else {
      onConfirmAction(null, shootDetails, guest ?? undefined);
      setSaving(false);
    }
  };

  const bodyContent = (
    <div className="flex flex-col gap-6 pt-2">
      {contcaveNote && (
        <Callout title="Note from ContCave" data-testid="booking-summary-contcave-note">
          <p className="whitespace-pre-line">{contcaveNote}</p>
        </Callout>
      )}
      <div className="space-y-3 text-muted-foreground">
        <div className="flex justify-between text-sm">
          <p>Booking Fee</p>
          <p>{formatINR(bookingFee)}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>Addons</p>
          <p>{formatINR(addonsSum)}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>Platform Fee</p>
          <p>{formatINR(platformFee)}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>GST (18%)</p>
          <p>{formatINR(gstAmount)}</p>
        </div>
        <hr className="border-border/40" />
        <div className="flex justify-between font-bold text-foreground text-base">
          <p>Total</p>
          <p>{formatINR(finalTotal)}</p>
        </div>
      </div>

      {isGuest && (
        <div className="space-y-4" data-testid="guest-checkout-details">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Your details</p>
            {onLoginAction && (
              <button type="button" onClick={onLoginAction} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Have an account? Log in
              </button>
            )}
          </div>
          <Input
            id="guestName"
            label="Full name"
            required
            autoComplete="name"
            maxLength={100}
            value={guestName}
            error={guestErrors.name}
            onChange={(e) => { setGuestName(e.target.value); setGuestErrors((prev) => ({ ...prev, name: undefined })); }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="guestPhone"
              label="Mobile number"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={14}
              placeholder="9876543210"
              value={guestPhone}
              error={guestErrors.phone}
              onChange={(e) => { setGuestPhone(e.target.value); setGuestErrors((prev) => ({ ...prev, phone: undefined })); }}
            />
            <Input
              id="guestEmail"
              label="Email"
              required
              type="email"
              autoComplete="email"
              maxLength={255}
              placeholder="you@example.com"
              value={guestEmail}
              error={guestErrors.email}
              onChange={(e) => { setGuestEmail(e.target.value); setGuestErrors((prev) => ({ ...prev, email: undefined })); }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            No account needed. We&apos;ll send your confirmation and invoice to this email, with a link to view your booking.
          </p>
          <hr className="border-border/40" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="pax"
          label="Number of people"
          required
          type="number"
          min={1}
          max={maximumPax || undefined}
          placeholder={maximumPax ? `Up to ${maximumPax}` : "e.g. 4"}
          value={pax}
          error={paxError ?? undefined}
          onChange={(e) => {
            setPax(e.target.value);
            setPaxError(null);
          }}
        />
        <Input
          id="shootType"
          label="Type of shoot (optional)"
          maxLength={100}
          placeholder="e.g. Product shoot, podcast"
          value={shootType}
          onChange={(e) => setShootType(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <Checkbox
          label="Need GST billing details?"
          checked={needGST}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNeedGST(e.target.checked)}
        />

        {needGST && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <Input
              id="companyName"
              label="Company Name"
              placeholder="e.g. Acme Corp Pvt Ltd"
              value={gstDetails.companyName}
              onChange={(e) =>
                setGstDetailsAction({ ...gstDetails, companyName: e.target.value })
              }
            />
            <Input
              id="gstin"
              label="GSTIN"
              maxLength={15}
              value={gstDetails.gstin}
              onChange={(e) =>
                setGstDetailsAction({ ...gstDetails, gstin: e.target.value.toUpperCase() })
              }
              placeholder="XXABCDE1234F2Z5"
            />
            <Textarea
              id="billingAddress"
              label="Billing Address"
              placeholder="123, Business Park..."
              value={gstDetails.billingAddress}
              onChange={(e) =>
                setGstDetailsAction({ ...gstDetails, billingAddress: e.target.value })
              }
            />
          </div>
        )}

        {gstError && <p className="text-sm text-destructive">{gstError}</p>}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {instantBooking
            ? "Your tax invoice is generated after payment confirmation."
            : "You receive a payment receipt after payment. Your tax invoice is generated only after the studio approves the booking."}
        </p>

        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={agree}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgree(e.target.checked)}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              I agree to the{" "}
              <Link href="/terms-and-conditions" target="_blank" className="text-foreground font-semibold underline">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" target="_blank" className="text-foreground font-semibold underline">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      testId="booking-summary-modal"
      onCloseAction={onCloseAction}
      onSubmitAction={handleConfirm}
      title="Booking Summary"
      body={bodyContent}
      actionLabel={saving ? "Processing..." : "Confirm & Continue"}
      secondaryActionLabel="Cancel"
      secondaryActionAction={onCloseAction}
      actionDisabled={!agree}
      disabled={saving}
      isLoading={saving}
      customWidth="w-full max-w-lg"
      customHeight="h-fit"
    />
  );
}
