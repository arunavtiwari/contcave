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

// Validators
const isValidAadhaar = (aadhaarNumber: string) =>
  /^[2-9]{1}[0-9]{11}$/.test(aadhaarNumber);
const isValidOtp = (otp: string) => /^[0-9]{6}$/.test(otp);
const isValidIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

// Vendor ID generator
const generateVendorId = () =>
  `vendor_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const getInitialStep = (user: any) => {
  if (!user.phone_verified || !user.email_verified) return 1;
  if (!user.aadhaar_verified) return 2;
  if (!user.bank_verified) return 3;
  return 4;
};

const VerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onComplete,
}) => {
  const [userState, setUserState] = useState(currentUser);
  const [step, setStep] = useState(getInitialStep(currentUser));
  const [loading, setLoading] = useState(false);

  // Phone
  const [otpState, setOtpState] = useState({
    phoneValue: currentUser?.phone || "",
    phoneValid: /^\d{10}$/.test(currentUser?.phone || ""),
  });

  // Email
  const [emailState, setEmailState] = useState({
    value: currentUser?.email || "",
    verified: !!currentUser?.email_verified,
    checking: false,
  });

  // Aadhaar
  const [aadhaarState, setAadhaarState] = useState({
    aadhaarNumber: currentUser?.aadhaar_last4
      ? "********" + currentUser?.aadhaar_last4
      : "",
    refId: null as string | number | null,
    otp: "",
    verified: !!currentUser?.aadhaar_verified,
  });

  // Bank
  const [bankState, setBankState] = useState({
    accountHolder: currentUser?.bank_verified_name || "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    pan: currentUser?.kyc_pan || "",
    gst: currentUser?.kyc_gst || "",
  });

  useEffect(() => {
    if (isOpen) {
      setUserState(currentUser);
      setStep(getInitialStep(currentUser));
      setOtpState({
        phoneValue: currentUser?.phone || "",
        phoneValid: /^\d{10}$/.test(currentUser?.phone || ""),
      });
      setEmailState({
        value: currentUser?.email || "",
        verified: !!currentUser?.email_verified,
        checking: false,
      });
      setAadhaarState({
        aadhaarNumber: currentUser?.aadhaar_last4
          ? "********" + currentUser?.aadhaar_last4
          : "",
        refId: null,
        otp: "",
        verified: !!currentUser?.aadhaar_verified,
      });
      setBankState({
        accountHolder: currentUser?.bank_verified_name || "",
        accountNumber: "",
        confirmAccountNumber: "",
        ifsc: "",
        pan: currentUser?.kyc_pan || "",
        gst: currentUser?.kyc_gst || "",
      });
    }
  }, [isOpen, currentUser]);

  // --- Email verification ---
  const verifyEmail = async () => {
    if (!emailState.value) return;
    setEmailState((s) => ({ ...s, checking: true }));

    try {
      const resp = await axios.post("/api/verify_email", {
        email: emailState.value,
      });
      const deliverable =
        resp.data?.data?.result?.valid &&
        resp.data?.data?.result?.result === "deliverable";

      if (deliverable) {
        const updated = await axios.patch("/api/user/verify", { step: "email" });
        setUserState(updated.data);
        setEmailState((s) => ({ ...s, verified: true, checking: false }));
        toast.success("Email verified ✅");
      } else {
        setEmailState((s) => ({ ...s, verified: false, checking: false }));
        toast.error("Email invalid ❌");
      }
    } catch (err) {
      console.error(err);
      setEmailState((s) => ({ ...s, verified: false, checking: false }));
      toast.error("Email verification failed");
    }
  };

  // --- Next handler ---
  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        if (!emailState.verified) {
          toast.error("Please verify your email first.");
          return;
        }
        if (!/^\d{10}$/.test(otpState.phoneValue)) {
          toast.error("Invalid phone number");
          return;
        }

        if (!userState.phone_verified || userState.phone !== otpState.phoneValue) {
          const updated = await axios.patch("/api/user/verify", {
            step: "phone",
            phone: otpState.phoneValue,
          });
          setUserState(updated.data);
          setOtpState({
            phoneValue: updated.data.phone,
            phoneValid: /^\d{10}$/.test(updated.data.phone || ""),
          });
        }

        toast.success("Phone verified ✅");
        setStep(2);
        return;
      }

      if (step === 2) {
        if (aadhaarState.verified || userState.aadhaar_verified) {
          setStep(3);
          return;
        }

        if (!aadhaarState.refId) {
          if (!isValidAadhaar(aadhaarState.aadhaarNumber)) {
            toast.error("Enter valid Aadhaar number");
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
          toast.error("Enter valid OTP");
          return;
        }

        const verifyResp = await axios.post("/api/verification", {
          refId: aadhaarState.refId,
          otp: aadhaarState.otp,
        });

        if (verifyResp.data.status === "VALID") {
          const updated = await axios.patch("/api/user/verify", {
            step: "aadhaar",
            aadhaarRefId: aadhaarState.refId,
          });
          setUserState(updated.data);
          setAadhaarState((s) => ({ ...s, verified: true }));
          toast.success("Aadhaar verified ✅");
          setStep(3);
        } else {
          if (verifyResp.data.error) {
            toast.error(verifyResp.data.error?.message || verifyResp.data.error || "Verification failed");
          } else {
            toast.error(verifyResp.data.message || "Invalid OTP");
          }
        }
        return;
      }

      if (step === 3) {
        if (userState.bank_verified) {
          toast.info("Bank already verified");
          onComplete?.();
          onClose();
          return;
        }

        if (
          !bankState.accountHolder ||
          !bankState.accountNumber ||
          bankState.accountNumber !== bankState.confirmAccountNumber ||
          !isValidIfsc(bankState.ifsc)
        ) {
          toast.error("Enter valid bank details");
          return;
        }

        const payload = {
          vendor_id: generateVendorId(),
          status: "ACTIVE",
          name: userState.name,
          email: userState.email,
          phone: userState.phone,
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

        await axios.post("/api/create_vendor", payload);
        const updated = await axios.patch("/api/user/verify", {
          step: "bank",
          bankVerifiedName: bankState.accountHolder,
        });
        setUserState(updated.data);
        toast.success("Bank verified ✅");
        onComplete?.();
        onClose();
        return;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step 1: Phone & Email</h3>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailState.value}
                onChange={(e) =>
                  setEmailState((s) => ({ ...s, value: e.target.value }))
                }
                className="border px-3 py-2 rounded-lg flex-1"
              />
              <button
                type="button"
                onClick={verifyEmail}
                disabled={emailState.checking || emailState.verified}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                {emailState.verified ? "Verified" : "Verify"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              type="tel"
              value={otpState.phoneValue}
              onChange={(e) =>
                setOtpState({
                  phoneValue: e.target.value.replace(/\D/g, "").slice(0, 10),
                  phoneValid: /^\d{10}$/.test(e.target.value),
                })
              }
              className="border px-3 py-2 rounded-lg w-full"
              placeholder="10-digit number"
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step 2: Aadhaar Verification</h3>

          {!aadhaarState.refId ? (
            <div>
              <label className="block text-sm font-medium">Aadhaar Number</label>
              <input
                type="text"
                value={aadhaarState.aadhaarNumber}
                onChange={(e) =>
                  setAadhaarState((s) => ({ ...s, aadhaarNumber: e.target.value }))
                }
                className="border px-3 py-2 rounded-lg w-full"
                placeholder="12-digit Aadhaar"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium">Enter OTP</label>
              <input
                type="text"
                value={aadhaarState.otp}
                onChange={(e) =>
                  setAadhaarState((s) => ({ ...s, otp: e.target.value }))
                }
                className="border px-3 py-2 rounded-lg w-full"
                placeholder="6-digit OTP"
              />
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step 3: Bank Details</h3>

          <div>
            <label className="block text-sm font-medium">Account Holder</label>
            <input
              type="text"
              value={bankState.accountHolder}
              onChange={(e) =>
                setBankState((s) => ({ ...s, accountHolder: e.target.value }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Account Number</label>
            <input
              type="text"
              value={bankState.accountNumber}
              onChange={(e) =>
                setBankState((s) => ({ ...s, accountNumber: e.target.value }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Confirm Account Number
            </label>
            <input
              type="text"
              value={bankState.confirmAccountNumber}
              onChange={(e) =>
                setBankState((s) => ({
                  ...s,
                  confirmAccountNumber: e.target.value,
                }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">IFSC</label>
            <input
              type="text"
              value={bankState.ifsc}
              onChange={(e) =>
                setBankState((s) => ({ ...s, ifsc: e.target.value.toUpperCase() }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">PAN</label>
            <input
              type="text"
              value={bankState.pan}
              onChange={(e) =>
                setBankState((s) => ({ ...s, pan: e.target.value.toUpperCase() }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">GST (optional)</label>
            <input
              type="text"
              value={bankState.gst}
              onChange={(e) =>
                setBankState((s) => ({ ...s, gst: e.target.value.toUpperCase() }))
              }
              className="border px-3 py-2 rounded-lg w-full"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-6">
        <h3 className="text-lg font-semibold">✅ Verification Complete</h3>
        <p className="text-gray-600">All steps have been successfully verified.</p>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Host Verification"
      onSubmit={handleNext}
      actionLabel={step === 3 ? "Finish" : "Next"}
      customWidth="max-w-2xl"
      body={<div>{renderStep()}</div>}
    />
  );
};

export default VerificationModal;
