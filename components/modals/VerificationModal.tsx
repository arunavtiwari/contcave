"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "@/components/modals/Modal";
import { FaCheckCircle, FaSpinner, FaExclamationCircle, FaShieldAlt } from "react-icons/fa";

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
    aadhaarNumber: (currentUser as unknown as Record<string, unknown>)?.aadhaar_last4
      ? "********" + (currentUser as unknown as Record<string, unknown>)?.aadhaar_last4
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
        aadhaarNumber: (currentUser as unknown as Record<string, unknown>)?.aadhaar_last4
          ? "********" + (currentUser as unknown as Record<string, unknown>)?.aadhaar_last4
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

  // --- Email verification ---
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
      const deliverable =
        resp.data?.data?.result?.valid &&
        resp.data?.data?.result?.result === "deliverable";

      if (deliverable) {
        const updated = await axios.patch("/api/user/verify", { step: "email" });
        setUserState(updated.data);
        setEmailState((s) => ({ ...s, verified: true, checking: false }));
        toast.success("Email verified successfully");
      } else {
        setEmailState((s) => ({ ...s, verified: false, checking: false }));
        setErrors({ email: "Email address is not deliverable" });
        toast.error("Email verification failed");
      }
    } catch (err: unknown) {
      console.error("Email verification error:", err);
      setEmailState((s) => ({ ...s, verified: false, checking: false }));
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Email verification failed";
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

            if (resp.data.status === "SUCCESS") {
              setAadhaarState((s) => ({ ...s, refId: resp.data.ref_id }));
              toast.success("OTP sent to Aadhaar-linked mobile number");
            } else {
              setErrors({ aadhaar: resp.data.message || "Failed to send OTP" });
              toast.error(resp.data.message || "Failed to send OTP");
            }
          } catch (err: unknown) {
            const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to send OTP";
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

          if (verifyResp.data.status === "VALID") {
            const updated = await axios.patch("/api/user/verify", {
              step: "aadhaar",
              aadhaarRefId: aadhaarState.refId,
            });
            setUserState(updated.data);
            setAadhaarState((s) => ({ ...s, verified: true }));
            toast.success("Aadhaar verified successfully");
            setStep(3);
          } else {
            const errorMsg = verifyResp.data.error?.message || verifyResp.data.message || "Verification failed";
            setErrors({ otp: errorMsg });
            toast.error(errorMsg);
          }
        } catch (err: unknown) {
          const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : "Verification failed";
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
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((stepItem, index) => {
          const isActive = step === stepItem.id;
          const isCompleted = step > stepItem.id;
          const stepNumber = index + 1;

          return (
            <React.Fragment key={stepItem.id}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-gray-200 text-gray-500"
                    }`}
                >
                  {isCompleted ? (
                    <FaCheckCircle className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
                      }`}
                  >
                    {stepItem.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{stepItem.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-20px] ${isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                />
              )}
            </React.Fragment>
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

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={emailState.value}
                    onChange={(e) => {
                      setEmailState((s) => ({ ...s, value: e.target.value, verified: false }));
                      clearError("email");
                    }}
                    disabled={emailState.verified}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : emailState.verified
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      } focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <FaExclamationCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={verifyEmail}
                  disabled={emailState.checking || emailState.verified || !emailState.value}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${emailState.verified
                    ? "bg-green-100 text-green-700 border border-green-300 cursor-not-allowed"
                    : emailState.checking
                      ? "bg-blue-100 text-blue-700 cursor-wait"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    }`}
                >
                  {emailState.checking ? (
                    <span className="flex items-center gap-2">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : emailState.verified ? (
                    <span className="flex items-center gap-2">
                      <FaCheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium whitespace-nowrap">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phoneState.phoneValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneState((s) => ({
                        ...s,
                        phoneValue: value,
                        phoneValid: /^\d{10}$/.test(value),
                        verified: false, // Reset verification if phone changes
                      }));
                      clearError("phone");
                    }}
                    disabled={phoneState.verified}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${errors.phone
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : phoneState.verified
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      } focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyPhone}
                  disabled={phoneState.checking || phoneState.verified || !phoneState.phoneValue}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${phoneState.verified
                    ? "bg-green-100 text-green-700 border border-green-300 cursor-not-allowed"
                    : phoneState.checking
                      ? "bg-blue-100 text-blue-700 cursor-wait"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    }`}
                >
                  {phoneState.checking ? (
                    <span className="flex items-center gap-2">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : phoneState.verified ? (
                    <span className="flex items-center gap-2">
                      <FaCheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <FaExclamationCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              )}
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <FaCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-900">Aadhaar Verified</p>
                <p className="text-sm text-green-700">
                  Your Aadhaar has been successfully verified
                </p>
              </div>
            </div>
          ) : !aadhaarState.refId ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={aadhaarState.aadhaarNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setAadhaarState((s) => ({ ...s, aadhaarNumber: value }));
                  clearError("aadhaar");
                }}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.aadhaar
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2`}
                placeholder="Enter 12-digit Aadhaar number"
                maxLength={12}
              />
              {errors.aadhaar && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <FaExclamationCircle className="w-3 h-3" />
                  {errors.aadhaar}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                <FaShieldAlt className="w-3 h-3 inline mr-1" />
                Your Aadhaar data is secure and encrypted
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={aadhaarState.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setAadhaarState((s) => ({ ...s, otp: value }));
                  clearError("otp");
                }}
                className={`w-full px-4 py-3 rounded-lg border transition-colors text-center text-2xl tracking-widest ${errors.otp
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2`}
                placeholder="000000"
                maxLength={6}
              />
              {errors.otp && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <FaExclamationCircle className="w-3 h-3" />
                  {errors.otp}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                OTP sent to your Aadhaar-linked mobile number
              </p>
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <FaCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-900">Bank Account Verified</p>
                <p className="text-sm text-green-700">
                  Account holder: {userState.bank_verified_name}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankState.accountHolder}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, accountHolder: e.target.value }));
                    clearError("accountHolder");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.accountHolder
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="Enter account holder name"
                />
                {errors.accountHolder && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.accountHolder}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankState.accountNumber}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, accountNumber: e.target.value.replace(/\D/g, "") }));
                    clearError("accountNumber");
                    clearError("confirmAccountNumber");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.accountNumber
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="Enter account number"
                />
                {errors.accountNumber && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.accountNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankState.confirmAccountNumber}
                  onChange={(e) => {
                    setBankState((s) => ({
                      ...s,
                      confirmAccountNumber: e.target.value.replace(/\D/g, ""),
                    }));
                    clearError("confirmAccountNumber");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.confirmAccountNumber
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : bankState.accountNumber &&
                      bankState.accountNumber === bankState.confirmAccountNumber
                      ? "border-green-300"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="Re-enter account number"
                />
                {errors.confirmAccountNumber && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.confirmAccountNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankState.ifsc}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, ifsc: e.target.value.toUpperCase().slice(0, 11) }));
                    clearError("ifsc");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors uppercase ${errors.ifsc
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="ABCD0123456"
                  maxLength={11}
                />
                {errors.ifsc && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.ifsc}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={bankState.pan}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, pan: e.target.value.toUpperCase().slice(0, 10) }));
                    clearError("pan");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors uppercase ${errors.pan
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {errors.pan && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.pan}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={bankState.gst}
                  onChange={(e) => {
                    setBankState((s) => ({ ...s, gst: e.target.value.toUpperCase().slice(0, 15) }));
                    clearError("gst");
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors uppercase ${errors.gst
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2`}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gst && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {errors.gst}
                  </p>
                )}
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
      customWidth="max-w-4xl"
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
