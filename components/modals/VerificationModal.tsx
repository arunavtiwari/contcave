"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "../modals/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onComplete?: () => void;
};

const steps = [
  { id: 1, title: "Phone & Email" },
  { id: 2, title: "Aadhaar KYC" },
  { id: 3, title: "Bank Details" },
];

// Aadhaar / OTP validators
function isValidAadhaar(aadhaarNumber: string) {
  return /^[2-9]{1}[0-9]{11}$/.test(aadhaarNumber);
}
function isValidOtp(otp: string) {
  return /^[0-9]{6}$/.test(otp);
}

// Vendor ID generator
function generateVendorId() {
  return `vendor_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Step calculation helper
const getInitialStep = (user: any) => {
  if (user?.bank_verified) return 3;
  if (user?.aadhaar_verified) return 3;
  if (user?.phone_verified) return 2;
  return 1;
};

const VerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onComplete,
}) => {
  const [step, setStep] = useState(getInitialStep(currentUser));
  const [loading, setLoading] = useState(false);

  // Step 1: Phone/email
  const [otpState, setOtpState] = useState({
    phoneValue: currentUser?.phone || "",
    phoneValid: /^\d{10}$/.test(currentUser?.phone || ""),
    emailVerified: !!currentUser?.email_verified,
  });

  // Step 2: Aadhaar
  const [aadhaarState, setAadhaarState] = useState({
    aadhaarNumber: currentUser?.aadhaar_last4
      ? "********" + currentUser?.aadhaar_last4
      : "",
    refId: null as string | number | null,
    otp: "",
    verified: !!currentUser?.aadhaar_verified,
  });

  // Step 3: Bank details
  const [bankState, setBankState] = useState({
    accountHolder: currentUser?.bank_verified_name || "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    pan: currentUser?.kyc_pan || "",
    gst: currentUser?.kyc_gst || "",
  });

  // Reset step on open
  useEffect(() => {
    if (isOpen) {
      setStep(getInitialStep(currentUser));
    }
  }, [isOpen, currentUser]);

  // --- Main flow ---
  const handleNext = async () => {
    try {
      setLoading(true);

      // --- Step 1: Phone & Email ---
      if (step === 1) {
        if (currentUser?.phone_verified) {
          setStep(2);
          return;
        }

        if (!/^\d{10}$/.test(otpState.phoneValue)) {
          toast.error("Invalid Phone Number");
          return;
        }

        await axios.patch("/api/user/verify", { step: "phone" });

        toast.success("Contact Information verified ✅");
        setStep(2);
      }

      // --- Step 2: Aadhaar ---
      else if (step === 2) {
        if (currentUser?.aadhaar_verified || aadhaarState.verified) {
          setStep(3);
          return;
        }

        if (!aadhaarState.refId) {
          if (!aadhaarState.aadhaarNumber) {
            toast.error("Enter Aadhaar number.");
            return;
          }
          if (!isValidAadhaar(aadhaarState.aadhaarNumber)) {
            toast.error("Enter a valid Aadhaar number.");
            return;
          }

          const resp = await axios.post("/api/generate_otp", {
            aadhaarNumber: aadhaarState.aadhaarNumber,
          });

          if (resp.data.status === "SUCCESS") {
            setAadhaarState((s) => ({ ...s, refId: resp.data.ref_id }));
            toast.success("OTP sent to Aadhaar-linked mobile!");
          } else {
            toast.error(resp.data.message || "Failed to send OTP.");
          }
          return;
        }

        if (!isValidOtp(aadhaarState.otp)) {
          toast.error("Enter a valid 6-digit OTP.");
          return;
        }

        const verifyResp = await axios.post("/api/verification", {
          refId: aadhaarState.refId,
          otp: aadhaarState.otp,
        });

        if (verifyResp.data.status === "VALID") {
          setAadhaarState((s) => ({ ...s, verified: true }));

          await axios.patch("/api/user/verify", {
            step: "aadhaar",
            aadhaarRefId: aadhaarState.refId,
          });

          toast.success("Aadhaar Verified 🎉");
          setStep(3);
        } else {
          toast.error("Invalid OTP or Aadhaar verification failed.");
        }
      }

      // --- Step 3: Bank Details ---
      else if (step === 3) {
        if (currentUser?.bank_verified) {
          toast.info("Bank details already verified ✅");
          onComplete?.();
          onClose();
          return;
        }

        if (
          !bankState.accountHolder ||
          !bankState.accountNumber ||
          !bankState.confirmAccountNumber ||
          bankState.accountNumber !== bankState.confirmAccountNumber ||
          !bankState.ifsc
        ) {
          toast.error("Fill valid bank details (accounts must match).");
          return;
        }

        try {
          const payload = {
            vendor_id: generateVendorId(),
            status: "ACTIVE",
            name: currentUser?.name,
            email: currentUser?.email,
            phone: currentUser?.phone,
            verify_account: true,
            dashboard_access: false,
            bank: {
              account_number: bankState.accountNumber,
              account_holder: bankState.accountHolder,
              ifsc: bankState.ifsc,
            },
            kyc_details: {
              account_type: "BUSINESS",
              business_type: "B2B",
              gst: bankState.gst || undefined,
              pan: bankState.pan || undefined,
            },
          };

          const resp = await axios.post("/api/create_vendor", payload);
          console.log("Vendor created:", resp.data);

          await axios.patch("/api/user/verify", {
            step: "bank",
            bankVerifiedName: bankState.accountHolder,
          });

          toast.success("Vendor created & verified 🎉");
          onComplete?.();
          onClose();
        } catch (err: any) {
          console.error(err);
          toast.error(err?.response?.data?.message || "Vendor creation failed");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => step > 1 && setStep((s) => s - 1);

  // --- Step UI ---
  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <input
            type="tel"
            value={otpState.phoneValue}
            onChange={(e) =>
              setOtpState({
                ...otpState,
                phoneValue: e.target.value,
                phoneValid: /^\d{10}$/.test(e.target.value),
              })
            }
            placeholder="Phone Number (10 digits)"
            className="w-full border px-3 py-2 rounded-lg"
            disabled={currentUser?.phone_verified}
          />
          <input
            type="email"
            value={currentUser?.email}
            disabled
            className="w-full border px-3 py-2 rounded-lg bg-gray-100"
          />
          {currentUser?.phone_verified && (
            <p className="text-green-600 text-sm">Phone already verified ✅</p>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <input
            type="text"
            value={aadhaarState.aadhaarNumber}
            onChange={(e) =>
              setAadhaarState({ ...aadhaarState, aadhaarNumber: e.target.value })
            }
            placeholder="Enter Aadhaar Number"
            className="w-full border px-3 py-2 rounded-lg"
            disabled={aadhaarState.verified || currentUser?.aadhaar_verified}
          />
          {aadhaarState.refId && !aadhaarState.verified && (
            <input
              type="text"
              value={aadhaarState.otp}
              onChange={(e) =>
                setAadhaarState({ ...aadhaarState, otp: e.target.value })
              }
              placeholder="Enter OTP"
              className="w-full border px-3 py-2 rounded-lg"
            />
          )}
          <p className="text-sm text-gray-600">
            {aadhaarState.verified || currentUser?.aadhaar_verified
              ? "Aadhaar already verified ✅"
              : 'Click "Send OTP" to generate OTP on Aadhaar-linked mobile.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <input
          type="text"
          value={bankState.accountHolder}
          onChange={(e) =>
            setBankState({ ...bankState, accountHolder: e.target.value })
          }
          placeholder="Account Holder Name"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        <input
          type="text"
          value={bankState.accountNumber}
          onChange={(e) =>
            setBankState({ ...bankState, accountNumber: e.target.value })
          }
          placeholder="Account Number"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        <input
          type="text"
          value={bankState.confirmAccountNumber}
          onChange={(e) =>
            setBankState({ ...bankState, confirmAccountNumber: e.target.value })
          }
          placeholder="Confirm Account Number"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        <input
          type="text"
          value={bankState.ifsc}
          onChange={(e) => setBankState({ ...bankState, ifsc: e.target.value })}
          placeholder="IFSC Code"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        <input
          type="text"
          value={bankState.pan}
          onChange={(e) => setBankState({ ...bankState, pan: e.target.value })}
          placeholder="PAN Number (optional)"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        <input
          type="text"
          value={bankState.gst}
          onChange={(e) => setBankState({ ...bankState, gst: e.target.value })}
          placeholder="GST Number (optional)"
          className="w-full border px-3 py-2 rounded-lg"
          disabled={currentUser?.bank_verified}
        />
        {currentUser?.bank_verified && (
          <p className="text-green-600 text-sm">
            Bank details already verified ✅
          </p>
        )}
        {!currentUser?.bank_verified && (
          <p className="text-xs text-gray-500">
            When you click Finish, we will submit bank + KYC details to Cashfree.
          </p>
        )}
      </div>
    );
  };

  const actionLabel =
    step === 1
      ? currentUser?.phone_verified
        ? "Next"
        : "Verify Phone"
      : step === 2
      ? currentUser?.aadhaar_verified || aadhaarState.verified
        ? "Next"
        : aadhaarState.refId
        ? "Submit OTP"
        : "Send OTP"
      : currentUser?.bank_verified
      ? "Close"
      : "Finish";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Host Verification"
      onSubmit={onClose}
      actionLabel={"Save Progress and Close"}
      customWidth="max-w-2xl"
      body={
        <div className="space-y-6 mt-6">
          {/* Stepper */}
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center text-sm">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                      step === s.id
                        ? "border-black bg-black text-white"
                        : step > s.id
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {s.id}
                  </div>
                  <span
                    className={`mt-2 ${
                      step === s.id
                        ? "text-black font-semibold"
                        : step > s.id
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div>{renderStep()}</div>

          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              {loading ? "Processing..." : actionLabel}
            </button>
          </div>
        </div>
      }
    />
  );
};

export default VerificationModal;
