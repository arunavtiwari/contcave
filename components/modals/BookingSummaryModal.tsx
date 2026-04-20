"use client";

import Link from "next/link";
import React, { useState } from "react";

import { saveBillingInfo } from "@/app/actions/billingActions";
import { createInvoice } from "@/app/actions/invoiceActions";
import Checkbox from "@/components/inputs/Checkbox";
import Input from "@/components/inputs/Input";
import Textarea from "@/components/inputs/Textarea";
import Modal from "@/components/modals/Modal";
import { billingSchema } from "@/schemas/billing";

type GSTDetails = {
  companyName: string;
  gstin: string;
  billingAddress: string;
};

type BookingSummaryModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: () => void;
  finalTotal: number;
  bookingFee: number;
  addonsSum: number;
  platformFee: number;
  gstAmount: number;
  subTotal: number;
  gstDetails: GSTDetails;
  setGstDetailsAction: (v: GSTDetails) => void;
  reservationId: string;
  transactionId: string;
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
  subTotal,
  gstDetails,
  setGstDetailsAction,
  reservationId,
  transactionId,
}: BookingSummaryModalProps) {
  const [needGST, setNeedGST] = useState(false);
  const [agree, setAgree] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);

    if (needGST) {
      const check = billingSchema.pick({ companyName: true, gstin: true, billingAddress: true }).safeParse(gstDetails);

      if (!check.success) {
        setGstError(check.error.issues[0].message);
        setSaving(false);
        return;
      }

      try {
        await saveBillingInfo({
          companyName: gstDetails.companyName,
          gstin: gstDetails.gstin,
          billingAddress: gstDetails.billingAddress,
          isDefault: true,
        });

        setGstDetailsAction({ ...gstDetails });

        const invoiceData = await createInvoice({
          reservationId,
          transactionId,
          amount: subTotal,
        });

        console.warn("Invoice URL:", invoiceData.invoiceUrl);
        onConfirmAction();
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
      onConfirmAction();
      setSaving(false);
    }
  };

  const bodyContent = (
    <div className="flex flex-col gap-6 pt-2">
      <div className="space-y-3 text-muted-foreground">
        <div className="flex justify-between text-sm">
          <p>Booking Fee</p>
          <p>₹{bookingFee}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>Addons</p>
          <p>₹{addonsSum}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>Platform Fee</p>
          <p>₹{platformFee}</p>
        </div>
        <div className="flex justify-between text-sm">
          <p>GST (18%)</p>
          <p>₹{gstAmount}</p>
        </div>
        <hr className="border-border/40" />
        <div className="flex justify-between font-bold text-foreground text-base">
          <p>Total</p>
          <p>₹{finalTotal}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Checkbox
          label="Need GST Invoice?"
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
