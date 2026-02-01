"use client";

import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { FieldErrors } from "react-hook-form";
import { FaCheckCircle, FaExclamationCircle, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-toastify";

import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SafeUser } from "@/types/user";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SafeUser | null;
  onComplete?: () => void;
};

const steps = [
  { id: 1, title: "Phone & Email", description: "Verify your contact information" },
  { id: 2, title: "Aadhaar KYC", description: "Complete identity verification" },
  { id: 3, title: "Bank Details", description: "Add payment information" },
];

// Validators
const isValidAadhaar = (aadhaarNumber: string): boolean => {
  const cleaned = aadhaarNumber.replace(/\s/g, "");
  return /^[2-9]{1}[0-9]{11}$/.test(cleaned);
};

const isValidOtp = (otp: string): boolean => /^[0-9]{6}$/.test(otp);
const isValidIfsc = (ifsc: string): boolean => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
const isValidPan = (pan: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
const isValidGst = (gst: string): boolean => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Vendor ID generator
const generateVendorId = (): string =>
  `vendor_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const getInitialStep = (user: SafeUser | null): number => {
  if (!user) return 1;
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
  const [userState, setUserState] = useState<SafeUser | null>(currentUser);
  const [step, setStep] = useState(getInitialStep(currentUser));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to convert simple errors to FieldErrors for Input component
  const fieldErrors: FieldErrors = Object.keys(errors).reduce((acc, key) => {
    return {
      ...acc,
      [key]: { type: 'manual', message: errors[key] }
    };
  }, {});

  // Phone
  const [phoneState, setPhoneState] = useState({
    phoneValue: currentUser?.phone || "",
    phoneValid: /^\d{10}$/.test(currentUser?.phone || ""),
    verified: !!currentUser?.phone_verified,
    checking: false,
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
      ? "********" + currentUser.aadhaar_last4
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
    pan: (currentUser as unknown as Record<string, unknown>)?.kyc_pan as string || "",
    gst: (currentUser as unknown as Record<string, unknown>)?.kyc_gst as string || "",
  });

  // Clear errors when inputs change
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  useEffect(() => {
    if (isOpen && currentUser) {
      setUserState(currentUser);
      setStep(getInitialStep(currentUser));
      setPhoneState({
        phoneValue: currentUser?.phone || "",
        phoneValid: /^\d{10}$/.test(currentUser?.phone || ""),
        verified: !!currentUser?.phone_verified,
        checking: false,
      });
      setEmailState({
        value: currentUser?.email || "",
        verified: !!currentUser?.email_verified,
        checking: false,
      });
      setAadhaarState({
        aadhaarNumber: currentUser?.aadhaar_last4
          ? "********" + currentUser.aadhaar_last4
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
        pan: (currentUser as unknown as Record<string, unknown>)?.kyc_pan as string || "",
        gst: (currentUser as unknown as Record<string, unknown>)?.kyc_gst as string || "",
      });
      setErrors({});
    }
  }, [isOpen, currentUser]);

  const verifyEmail = async () => {
    if (!emailState.value) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!isValidEmail(emailState.value)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    clearError("email");
    setEmailState((s) => ({ ...s, checking: true }));

    try {
      const resp = await axios.post("/api/verify_email", {
        email: emailState.value,
      });

      const verificationResult = resp.data?.data?.result;

      if (verificationResult === "undeliverable") {
        setEmailState((s) => ({ ...s, verified: false, checking: false }));
        setErrors({ email: "Email address is not deliverable" });
        toast.error("Email address is not deliverable");
        return;
      }

      const updated = await axios.patch("/api/user/verify", { step: "email" });
      setUserState(updated.data);
      setEmailState((s) => ({ ...s, verified: true, checking: false }));
      toast.success("Email verified successfully");
    } catch (err: unknown) {
      console.error("Email verification error:", err);
      setEmailState((s) => ({ ...s, verified: false, checking: false }));

      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.message
        : "Email verification failed";

      setErrors({ email: errorMsg || "Email verification failed" });
      toast.error(errorMsg || "Email verification failed");
    }
  };

  // --- Phone verification ---
  const verifyPhone = async () => {
    if (!phoneState.phoneValue) {
      setErrors({ phone: "Phone number is required" });
      return;
    }

    if (!/^\d{10}$/.test(phoneState.phoneValue)) {
      setErrors({ phone: "Please enter a valid 10-digit phone number" });
      return;
    }

    clearError("phone");
    setPhoneState((s) => ({ ...s, checking: true }));

    try {
      const updated = await axios.patch("/api/user/verify", {
        step: "phone",
        phone: phoneState.phoneValue,
      });
      setUserState(updated.data);
      setPhoneState((s) => ({
        ...s,
        verified: true,
        checking: false,
        phoneValue: updated.data.phone || phoneState.phoneValue,
        phoneValid: true,
      }));
      toast.success("Phone number verified successfully");
    } catch (err: unknown) {
      console.error("Phone verification error:", err);
      setPhoneState((s) => ({ ...s, verified: false, checking: false }));
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Phone verification failed";
      setErrors({ phone: errorMsg || "Phone verification failed" });
      toast.error(errorMsg || "Phone verification failed");
    }
  };

  // --- Next handler ---
  const handleNext = async () => {
    setLoading(true);
    setErrors({});

    try {
      if (step === 1) {
        // Both email and phone must be verified
        if (!emailState.verified) {
          setErrors({ email: "Please verify your email first" });
          toast.error("Please verify your email first");
          setLoading(false);
          return;
        }

        if (!phoneState.verified) {
          setErrors({ phone: "Please verify your phone number first" });
          toast.error("Please verify your phone number first");
          setLoading(false);
          return;
        }

        // Both verified, proceed to next step
        setStep(2);
        setLoading(false);
        return;
      }

      if (step === 2) {
        if (aadhaarState.verified || userState?.aadhaar_verified) {
          setStep(3);
          setLoading(false);
          return;
        }

        if (!aadhaarState.refId) {
          const cleanedAadhaar = aadhaarState.aadhaarNumber.replace(/\s/g, "");
          if (!isValidAadhaar(cleanedAadhaar)) {
            setErrors({ aadhaar: "Please enter a valid 12-digit Aadhaar number" });
            toast.error("Enter valid Aadhaar number");
            setLoading(false);
            return;
          }

          try {
            const resp = await axios.post("/api/generate_otp", {
              aadhaarNumber: cleanedAadhaar,
            });

            if (resp.data.success) {
              setAadhaarState((s) => ({ ...s, refId: resp.data.data.ref_id }));
              toast.success("OTP sent to Aadhaar-linked mobile number");
            } else {
              setErrors({ aadhaar: resp.data.error || "Failed to send OTP" });
              toast.error(resp.data.error || "Failed to send OTP");
            }
          } catch (err: unknown) {
            const errorMsg = axios.isAxiosError(err)
              ? (err.response?.data?.error || err.response?.data?.message)
              : "Failed to send OTP";
            setErrors({ aadhaar: errorMsg || "Failed to send OTP" });
            toast.error(errorMsg || "Failed to send OTP");
          }
          setLoading(false);
          return;
        }

        if (!isValidOtp(aadhaarState.otp)) {
          setErrors({ otp: "Please enter a valid 6-digit OTP" });
          toast.error("Enter valid OTP");
          setLoading(false);
          return;
        }

        try {
          const verifyResp = await axios.post("/api/verification", {
            refId: aadhaarState.refId,
            otp: aadhaarState.otp,
          });

          if (verifyResp.data.success) {
            const updated = await axios.patch("/api/user/verify", {
              step: "aadhaar",
              aadhaarRefId: aadhaarState.refId,
              aadhaarLast4: aadhaarState.aadhaarNumber.slice(-4),
            });
            setUserState(updated.data);
            setAadhaarState((s) => ({ ...s, verified: true }));
            toast.success("Aadhaar verified successfully");
            setStep(3);
          } else {
            const errorMsg = verifyResp.data.error || "Verification failed";
            setErrors({ otp: errorMsg });
            toast.error(errorMsg);
          }
        } catch (err: unknown) {
          const errorMsg = axios.isAxiosError(err)
            ? (err.response?.data?.error || err.response?.data?.message)
            : "Verification failed";
          setErrors({ otp: errorMsg || "Verification failed" });
          toast.error(errorMsg || "Verification failed");
        }
        setLoading(false);
        return;
      }

      if (step === 3) {
        if (userState?.bank_verified) {
          toast.info("Bank already verified");
          onComplete?.();
          onClose();
          setLoading(false);
          return;
        }

        const newErrors: Record<string, string> = {};

        if (!bankState.accountHolder?.trim()) {
          newErrors.accountHolder = "Account holder name is required";
        }
        if (!bankState.accountNumber?.trim()) {
          newErrors.accountNumber = "Account number is required";
        }
        if (!bankState.confirmAccountNumber?.trim()) {
          newErrors.confirmAccountNumber = "Please confirm account number";
        }
        if (bankState.accountNumber !== bankState.confirmAccountNumber) {
          newErrors.confirmAccountNumber = "Account numbers do not match";
        }
        if (!isValidIfsc(bankState.ifsc)) {
          newErrors.ifsc = "Please enter a valid IFSC code";
        }
        if (bankState.pan && !isValidPan(bankState.pan)) {
          newErrors.pan = "Please enter a valid PAN number";
        }
        if (bankState.gst && !isValidGst(bankState.gst)) {
          newErrors.gst = "Please enter a valid GST number";
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          toast.error("Please check your bank details");
          setLoading(false);
          return;
        }

        try {
          const payload = {
            vendor_id: generateVendorId(),
            status: "ACTIVE",
            name: userState?.name,
            email: userState?.email,
            phone: userState?.phone,
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
            vendorId: payload.vendor_id,
            accountNumber: bankState.accountNumber,
            ifscCode: bankState.ifsc,
            gstin: bankState.gst || undefined,
            companyName: userState?.name || undefined,
            bankName: undefined,
          });
          setUserState(updated.data);
          toast.success("Bank details verified successfully");
          onComplete?.();
          onClose();
        } catch (err: unknown) {
          const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to verify bank details";
          toast.error(errorMsg || "Failed to verify bank details");
          setErrors({ submit: errorMsg || "Failed to verify bank details" });
        }
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      console.error("Verification error:", err);
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Something went wrong. Please try again.";
      toast.error(errorMsg || "Something went wrong. Please try again.");
      setErrors({ submit: errorMsg || "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  // Step Progress Indicator
  const renderStepProgress = () => (
    <div className="mb-8 px-4">
      <div className="flex items-start w-full">
        {steps.map((stepItem, index) => {
          const isActive = step === stepItem.id;
          const isCompleted = step > stepItem.id;
          const stepNumber = index + 1;

          return (
            <div key={stepItem.id} className="flex-1 flex flex-col items-center relative">
              {/* Left Connector */}
              {index > 0 && (
                <div
                  className={`absolute top-5 left-0 w-[calc(50%+1px)] h-[2px] -translate-y-1/2 transition-colors duration-300 ${step >= stepItem.id ? "bg-black" : "bg-gray-200"
                    }`}
                />
              )}

              {/* Right Connector */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-5 right-0 w-[calc(50%+1px)] h-[2px] -translate-y-1/2 transition-colors duration-300 ${step > stepItem.id ? "bg-black" : "bg-gray-200"
                    }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all border-2 relative z-10 ${isCompleted
                  ? "border-black bg-black text-white"
                  : isActive
                    ? "border-black text-black bg-white"
                    : "border-gray-200 text-gray-400 bg-white"
                  }`}
              >
                {isCompleted ? (
                  <FaCheckCircle className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
              <div className="mt-3 text-center px-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${isActive || isCompleted ? "text-black" : "text-gray-400"
                    }`}
                >
                  {stepItem.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Information</h3>
            <p className="text-sm text-gray-600">Verify your email and phone number to continue</p>
          </div>

          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    id="email"
                    type="email"
                    value={emailState.value}
                    onChange={(e) => {
                      setEmailState((s) => ({ ...s, value: e.target.value, verified: false }));
                      clearError("email");
                    }}
                    disabled={emailState.verified}
                    required
                    errors={fieldErrors}
                    placeholder="your.email@example.com"
                    className={`${emailState.verified ? "border-green-500 bg-green-50 text-green-700" : ""}`}
                  />
                </div>
                <div className="min-w-[160px]">
                  <Button
                    label={emailState.verified ? "Verified" : "Verify"}
                    onClick={verifyEmail}
                    disabled={emailState.checking || emailState.verified || !emailState.value}
                    loading={emailState.checking}
                    icon={emailState.verified ? FaCheckCircle : undefined}
                    classNames={`h-[48px] ${emailState.verified
                      ? "bg-green-100 text-green-700 border-green-200 disabled:opacity-100"
                      : "bg-black text-white disabled:bg-neutral-200 disabled:text-neutral-400 disabled:opacity-100"
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneState.phoneValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneState((s) => ({
                        ...s,
                        phoneValue: value,
                        phoneValid: /^\d{10}$/.test(value),
                        verified: false,
                      }));
                      clearError("phone");
                    }}
                    disabled={phoneState.verified}
                    required
                    errors={fieldErrors}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    formatPrice={false}
                    className={`${phoneState.verified ? "border-green-500 bg-green-50 text-green-700" : ""}`}
                  />
                </div>
                <div className="min-w-[160px]">
                  <Button
                    label={phoneState.verified ? "Verified" : "Verify"}
                    onClick={verifyPhone}
                    disabled={phoneState.checking || phoneState.verified || !phoneState.phoneValue}
                    loading={phoneState.checking}
                    icon={phoneState.verified ? FaCheckCircle : undefined}
                    classNames={`h-[48px] ${phoneState.verified
                      ? "bg-green-100 text-green-700 border-green-200 disabled:opacity-100"
                      : "bg-black text-white disabled:bg-neutral-200 disabled:text-neutral-400 disabled:opacity-100"
                      }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aadhaar Verification</h3>
            <p className="text-sm text-gray-600">
              {!aadhaarState.refId
                ? "Enter your Aadhaar number to receive an OTP on your registered mobile"
                : "Enter the 6-digit OTP sent to your Aadhaar-linked mobile number"}
            </p>
          </div>

          {aadhaarState.verified || userState?.aadhaar_verified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900 text-lg">Aadhaar Verified</p>
                <p className="text-sm text-green-700">
                  Your identity has been successfully verified
                </p>
              </div>
            </div>
          ) : !aadhaarState.refId ? (
            <div>
              <Input
                id="aadhaar"
                label="Aadhaar Number"
                type="text"
                value={aadhaarState.aadhaarNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setAadhaarState((s) => ({ ...s, aadhaarNumber: value }));
                  clearError("aadhaar");
                }}
                required
                errors={fieldErrors}
                placeholder="Enter 12-digit Aadhaar number"
                maxLength={12}
              />
              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5 p-2 bg-gray-50 rounded-md border border-gray-100">
                <FaShieldAlt className="w-3 h-3 text-gray-400" />
                Your Aadhaar data is secure and encrypted
              </p>
            </div>
          ) : (
            <div>
              <Input
                id="otp"
                label="Enter OTP"
                type="text"
                value={aadhaarState.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setAadhaarState((s) => ({ ...s, otp: value }));
                  clearError("otp");
                }}
                required
                errors={fieldErrors}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  OTP sent to your Aadhaar-linked mobile
                </p>
                <button
                  onClick={() => setAadhaarState(s => ({ ...s, refId: null, otp: "" }))}
                  className="text-xs font-medium text-black underline hover:opacity-80"
                >
                  Change Aadhaar Number
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank Account Details</h3>
            <p className="text-sm text-gray-600">
              Add your bank account information for receiving payments
            </p>
          </div>

          {userState?.bank_verified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900 text-lg">Bank Account Verified</p>
                <p className="text-sm text-green-700">
                  Account holder: {userState.bank_verified_name}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input
                  id="accountHolder"
                  label="Account Holder Name"
                  type="text"
                  value={bankState.accountHolder}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, accountHolder: e.target.value }));
                    clearError("accountHolder");
                  }}
                  required
                  errors={fieldErrors}
                  placeholder="Enter account holder name"
                />
              </div>

              <div>
                <Input
                  id="accountNumber"
                  label="Account Number"
                  type="text"
                  value={bankState.accountNumber}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, accountNumber: e.target.value.replace(/\D/g, "") }));
                    clearError("accountNumber");
                    clearError("confirmAccountNumber");
                  }}
                  required
                  errors={fieldErrors}
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <Input
                  id="confirmAccountNumber"
                  label="Confirm Account Number"
                  type="text"
                  value={bankState.confirmAccountNumber}
                  onChange={(e) => {
                    setBankState((s) => ({
                      ...s,
                      confirmAccountNumber: e.target.value.replace(/\D/g, ""),
                    }));
                    clearError("confirmAccountNumber");
                  }}
                  required
                  errors={fieldErrors}
                  placeholder="Re-enter account number"
                  className={bankState.accountNumber && bankState.accountNumber === bankState.confirmAccountNumber ? "border-green-500 focus:ring-green-500" : ""}
                />
              </div>

              <div>
                <Input
                  id="ifsc"
                  label="IFSC Code"
                  type="text"
                  value={bankState.ifsc}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, ifsc: e.target.value.toUpperCase().slice(0, 11) }));
                    clearError("ifsc");
                  }}
                  required
                  errors={fieldErrors}
                  placeholder="ABCD0123456"
                  maxLength={11}
                  className="uppercase"
                />
              </div>

              <div>
                <Input
                  id="pan"
                  label="PAN Number"
                  type="text"
                  value={bankState.pan}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, pan: e.target.value.toUpperCase().slice(0, 10) }));
                    clearError("pan");
                  }}
                  errors={fieldErrors}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="uppercase"
                />
              </div>

              <div>
                <Input
                  id="gst"
                  label="GST Number"
                  type="text"
                  value={bankState.gst}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, gst: e.target.value.toUpperCase().slice(0, 15) }));
                    clearError("gst");
                  }}
                  errors={fieldErrors}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="uppercase"
                />

              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Verification Complete!</h3>
        <p className="text-gray-600">All steps have been successfully verified. You can now start hosting.</p>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Host Verification"
      onSubmit={handleNext}
      actionLabel={step === 3 ? "Complete Verification" : step === 4 ? "Close" : "Continue"}
      disabled={loading}
      isLoading={loading}
      customWidth="w-full md:w-4/6 lg:w-3/6 xl:w-2/5"
      body={
        <div>
          {renderStepProgress()}
          {renderStep()}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>
      }
    />
  );
};

export default VerificationModal;
