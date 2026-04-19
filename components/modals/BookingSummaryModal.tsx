"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { saveBillingInfo } from "@/app/actions/billingActions";
import { createInvoice } from "@/app/actions/invoiceActions";
import Checkbox from "@/components/ui/Checkbox";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
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
  const sectionId = useId();
  const [needGST, setNeedGST] = useState(false);
  const [agree, setAgree] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${sectionId}-booking-summary-title`}
      onClick={() => onCloseAction()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-background  p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Heading
          title="Booking Summary"
          variant="h5"
          id={`${sectionId}-booking-summary-title`}
          className="mb-2"
        />


        <div className="mb-4 space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <p>Booking Fee</p>
            <p>₹{bookingFee}</p>
          </div>
          <div className="flex justify-between">
            <p>Addons</p>
            <p>₹{addonsSum}</p>
          </div>
          <div className="flex justify-between">
            <p>Platform Fee</p>
            <p>₹{platformFee}</p>
          </div>
          <div className="flex justify-between">
            <p>GST (18%)</p>
            <p>₹{gstAmount}</p>
          </div>
          <hr />
          <div className="flex justify-between font-semibold">
            <p>Total</p>
            <p>₹{finalTotal}</p>
          </div>
        </div>



        <div className="mb-4">
          <Checkbox
            label="Need GST Invoice?"
            checked={needGST}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNeedGST(e.target.checked)}
          />
        </div>


        {needGST && (
          <div className="space-y-3 mb-4 text-foreground">

            <div>
              <Input
                id="companyName"
                label="Company Name"
                placeholder="e.g. Acme Corp Pvt Ltd"
                value={gstDetails.companyName}
                onChange={(e) =>
                  setGstDetailsAction({ ...gstDetails, companyName: e.target.value })
                }
              />
            </div>

            <div>
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
            </div>

            <div>
              <Textarea
                id="billingAddress"
                label="Billing Address"
                placeholder="123, Business Park, Sector 5, Kolkata, 700091"
                value={gstDetails.billingAddress}
                onChange={(e) =>
                  setGstDetailsAction({ ...gstDetails, billingAddress: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {gstError && <p className="text-sm text-destructive mb-2">{gstError}</p>}


        <div className="mt-4 mb-5">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Checkbox
              label="I agree to the"
              checked={agree}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgree(e.target.checked)}
            />
            <span className="font-medium">
              <Link
                href="/terms-and-conditions"
                target="_blank"
                className="text-foreground font-semibold underline hover:text-foreground/80 leading-none"
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="text-foreground font-semibold underline hover:text-foreground/80 leading-none"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </div>
        </div>


        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-border hover:bg-muted"
            onClick={onCloseAction}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-background ${agree
              ? "bg-foreground hover:opacity-90"
              : "bg-muted cursor-not-allowed"
              }`}
            onClick={handleConfirm}
            disabled={!agree || saving}
          >
            {saving ? "Savingâ€¦" : "Confirm & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

