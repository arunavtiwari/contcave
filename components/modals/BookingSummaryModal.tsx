"use client";

import { useId, useState } from "react";

type GSTDetails = {
  companyName: string;
  gstin: string;
  billingAddress: string;
};

type BookingSummaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  finalTotal: number;
  bookingFee: number;
  addonsSum: number;
  platformFee: number;
  gstDetails: GSTDetails;
  setGstDetails: (v: GSTDetails) => void;
  currentUserId: string;
};

export default function BookingSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  finalTotal,
  bookingFee,
  addonsSum,
  platformFee,
  gstDetails,
  setGstDetails,
  currentUserId,
}: BookingSummaryModalProps) {
  const sectionId = useId();
  const [needGST, setNeedGST] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (needGST) {
      // basic GSTIN validation: 15 alphanumeric characters
      if (!gstDetails.gstin.match(/^[0-9A-Z]{15}$/i)) {
        setGstError("Please enter a valid 15-character GSTIN.");
        return;
      }
      if (!gstDetails.companyName || !gstDetails.billingAddress) {
        setGstError("Please fill all GST fields.");
        return;
      }

      setGstError(null);
      setSaving(true);

      try {
        const res = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            companyName: gstDetails.companyName,
            gstin: gstDetails.gstin,
            billingAddress: gstDetails.billingAddress,
            isDefault: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to save GST info");

        // optionally, update GST details with returned ID
        setGstDetails({ ...gstDetails });

        onConfirm(); // proceed after successful save
      } catch (err: any) {
        console.error(err);
        setGstError(err.message || "Failed to save GST info. Try again.");
      } finally {
        setSaving(false);
      }
    } else {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${sectionId}-booking-summary-title`}
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id={`${sectionId}-booking-summary-title`}
          className="text-lg font-semibold mb-2"
        >
          Booking Summary
        </h3>

        <div className="mb-4 space-y-2 text-gray-700">
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
          <hr />
          <div className="flex justify-between font-semibold">
            <p>Total</p>
            <p>₹{finalTotal}</p>
          </div>
        </div>

        {/* GST Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={needGST}
              onChange={(e) => setNeedGST(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Need GST Invoice?</span>
          </label>
        </div>

        {/* GST Fields */}
        {needGST && (
          <div className="space-y-3 mb-4 text-gray-700">
            <div>
              <label className="block text-sm mb-1">Company Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={gstDetails.companyName}
                onChange={(e) =>
                  setGstDetails({ ...gstDetails, companyName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">GSTIN</label>
              <input
                type="text"
                maxLength={15}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={gstDetails.gstin}
                onChange={(e) =>
                  setGstDetails({ ...gstDetails, gstin: e.target.value.toUpperCase() })
                }
                placeholder="XXABCDE1234F2Z5"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Billing Address</label>
              <textarea
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={gstDetails.billingAddress}
                onChange={(e) =>
                  setGstDetails({ ...gstDetails, billingAddress: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {gstError && <p className="text-sm text-red-600 mb-2">{gstError}</p>}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-white bg-black hover:opacity-90`}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Saving…" : "Confirm & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
