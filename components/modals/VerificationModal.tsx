"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { z } from "zod";

import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  aadhaarSchema,
  BankSchema,
  bankSchema,
  otpSchema,
  phoneVerificationSchema,
} from "@/lib/schemas/verification";
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


  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});




  const [phoneState, setPhoneState] = useState({
    phoneValue: currentUser?.phone || "",
    verified: !!currentUser?.phone_verified,
    checking: false,
  });

  const [emailState, setEmailState] = useState({
    value: currentUser?.email || "",
    verified: !!currentUser?.email_verified,
    checking: false,
  });




  const [aadhaarState, setAadhaarState] = useState({
    aadhaarNumber: currentUser?.aadhaar_last4 ? "********" + currentUser.aadhaar_last4 : "",
    refId: null as string | null,
    otp: "",
    verified: !!currentUser?.aadhaar_verified,
  });




  const {
    register,
    handleSubmit,
    formState: { errors: bankErrors },
    reset: resetBankForm,
  } = useForm<BankSchema>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      accountHolderName: currentUser?.bank_verified_name || "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      gstin: "",
    },
  });


  useEffect(() => {
    if (isOpen && currentUser) {
      setUserState(currentUser);
      setStep(getInitialStep(currentUser));
      setPhoneState({
        phoneValue: currentUser?.phone || "",
        verified: !!currentUser?.phone_verified,
        checking: false,
      });
      setEmailState({
        value: currentUser?.email || "",
        verified: !!currentUser?.email_verified,
        checking: false,
      });
      setAadhaarState({
        aadhaarNumber: currentUser?.aadhaar_last4 ? "********" + currentUser.aadhaar_last4 : "",
        refId: null,
        otp: "",
        verified: !!currentUser?.aadhaar_verified,
      });

      resetBankForm({
        accountHolderName: currentUser?.bank_verified_name || "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        gstin: "",
      });
      setCustomErrors({});
    }
  }, [isOpen, currentUser, resetBankForm]);


  const getFieldError = (fieldName: string) => {
    return customErrors[fieldName]
      ? { type: "manual", message: customErrors[fieldName] }
      : undefined;
  };

  const clearCustomError = (field: string) => {
    setCustomErrors(prev => {
      const newErr = { ...prev };
      delete newErr[field];
      return newErr;
    });
  };




  const verifyEmail = async () => {
    const emailCheck = z.string().email("Invalid email").safeParse(emailState.value);
    if (!emailCheck.success) {
      setCustomErrors({ email: emailCheck.error.issues[0].message });
      return;
    }

    clearCustomError("email");
    setEmailState((s) => ({ ...s, checking: true }));

    try {
      const resp = await axios.post("/api/verify_email", { email: emailState.value });
      if (resp.data?.data?.result === "undeliverable") {
        setEmailState((s) => ({ ...s, verified: false, checking: false }));
        setCustomErrors({ email: "Email address is not deliverable" });
        return;
      }

      const updated = await axios.patch("/api/user/verify", { step: "email" });
      setUserState(updated.data);
      setEmailState((s) => ({ ...s, verified: true, checking: false }));
      toast.success("Email verified successfully");
    } catch (err: unknown) {
      console.error("Email verify error:", err);
      setEmailState((s) => ({ ...s, verified: false, checking: false }));
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Email verification failed";
      setCustomErrors({ email: message });
    }
  };

  const verifyPhone = async () => {
    const phoneCheck = phoneVerificationSchema.safeParse({ phone: phoneState.phoneValue });
    if (!phoneCheck.success) {
      setCustomErrors({ phone: phoneCheck.error.issues[0].message });
      return;
    }

    clearCustomError("phone");
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
      }));
      toast.success("Phone verified");
    } catch (err: unknown) {
      setPhoneState((s) => ({ ...s, verified: false, checking: false }));
      const axiosError = err as { response?: { data?: { message?: string } } };
      setCustomErrors({ phone: axiosError.response?.data?.message || "Phone verification failed" });
    }
  };




  const handleGenerateOtp = async () => {
    const cleaned = aadhaarState.aadhaarNumber.replace(/\s/g, "");
    const check = aadhaarSchema.pick({ aadhaarNumber: true }).safeParse({ aadhaarNumber: cleaned });

    if (!check.success) {
      setCustomErrors({ aadhaar: check.error.issues[0].message });
      return;
    }

    setLoading(true);
    try {
      const resp = await axios.post("/api/generate_otp", { aadhaarNumber: cleaned });
      if (resp.data.success) {
        setAadhaarState((s) => ({ ...s, refId: resp.data.data.ref_id }));
        toast.success("OTP sent");
      } else {
        setCustomErrors({ aadhaar: resp.data.error || "Failed to send OTP" });
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setCustomErrors({ aadhaar: axiosError.response?.data?.message || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!aadhaarState.refId) return;
    const check = otpSchema.safeParse({ otp: aadhaarState.otp, refId: aadhaarState.refId });
    if (!check.success) {
      const otpError = check.error.issues.find((e) => e.path[0] === 'otp');
      setCustomErrors({ otp: otpError?.message || "Invalid OTP" });
      return;
    }

    setLoading(true);
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
        toast.success("Aadhaar Verified");
        setStep(3);
      } else {
        setCustomErrors({ otp: verifyResp.data.error || "Verification failed" });
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setCustomErrors({ otp: axiosError.response?.data?.message || "Verification failed" });
    } finally {
      setLoading(false);
    }
  };


  const onBankSubmit = async (data: BankSchema) => {
    setLoading(true);
    try {
      const vendorPayload = {
        vendor_id: generateVendorId(),
        display_name: userState?.name,
        email: userState?.email,
        phone: phoneState.phoneValue,
        account_number: data.accountNumber,
        account_holder: data.accountHolderName,
        ifsc: data.ifscCode,
        
        kyc_details: {
          account_type: "BUSINESS",
          business_type: "B2B",
          ...(data.gstin && { gst: data.gstin }),
        },
      };

      await axios.post("/api/create_vendor", vendorPayload);

      const updated = await axios.patch("/api/user/verify", {
        step: "bank",
        bankVerifiedName: data.accountHolderName,
        vendorId: vendorPayload.vendor_id,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
      });

      setUserState(updated.data);
      toast.success("Bank Verified!");
      onComplete?.();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Bank verification failed");
    } finally {
      setLoading(false);
    }
  };




  const handleNextClick = () => {
    setCustomErrors({});
    if (step === 1) {
      if (!emailState.verified) {
        setCustomErrors({ email: "Please verify email first" });
        return;
      }
      if (!phoneState.verified) {
        setCustomErrors({ phone: "Please verify phone first" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (aadhaarState.verified || userState?.aadhaar_verified) {
        setStep(3);
      } else {
        if (!aadhaarState.refId) {
          handleGenerateOtp();
        } else {
          handleVerifyOtp();
        }
      }
    } else if (step === 3) {

      handleSubmit(onBankSubmit)();
    }
  };





  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Contact Info</h3>
            <p className="text-sm text-gray-500">Verify email and phone to continue.</p>
          </div>


          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                id="email"
                label="Email"
                placeholder="you@example.com"
                value={emailState.value}
                onChange={(e) => {
                  setEmailState(s => ({ ...s, value: e.target.value, verified: false }));
                  clearCustomError("email");
                }}
                disabled={emailState.verified}
                errors={{ email: getFieldError("email") }}
                className={emailState.verified ? "border-green-500 bg-green-50 text-green-700" : ""}
              />
            </div>
            <div className="min-w-[120px]">
              <Button
                label={emailState.verified ? "Verified" : "Verify"}
                variant={emailState.verified ? "success" : "default"}
                onClick={verifyEmail}
                loading={emailState.checking}
                disabled={emailState.verified || !emailState.value}
              />
            </div>
          </div>


          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                id="phone"
                label="Phone"
                placeholder="10-digit mobile number"
                value={phoneState.phoneValue}
                onChange={(e) => {
                  setPhoneState(s => ({ ...s, phoneValue: e.target.value.replace(/\D/g, "").slice(0, 10), verified: false }));
                  clearCustomError("phone");
                }}
                disabled={phoneState.verified}
                errors={{ phone: getFieldError("phone") }}
                maxLength={10}
                className={phoneState.verified ? "border-green-500 bg-green-50 text-green-700" : ""}
              />
            </div>
            <div className="min-w-[120px]">
              <Button
                label={phoneState.verified ? "Verified" : "Verify"}
                variant={phoneState.verified ? "success" : "default"}
                onClick={verifyPhone}
                loading={phoneState.checking}
                disabled={phoneState.verified || !phoneState.phoneValue}
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Aadhaar KYC</h3>
            <p className="text-sm text-gray-500">Secure identity verification.</p>
          </div>

          {aadhaarState.verified || userState?.aadhaar_verified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-center gap-4">
              <FaCheckCircle className="text-green-600 text-xl" />
              <div>
                <p className="font-semibold text-green-900">Aadhaar Verified</p>
                <p className="text-sm text-green-700">Identity confirmed securely.</p>
              </div>
            </div>
          ) : !aadhaarState.refId ? (
            <div>
              <Input
                id="aadhaar"
                label="Aadhaar Number"
                value={aadhaarState.aadhaarNumber}
                onChange={(e) => {
                  setAadhaarState(s => ({ ...s, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }));
                  clearCustomError("aadhaar");
                }}
                errors={{ aadhaar: getFieldError("aadhaar") }}
                maxLength={12}
                placeholder="12-digit number"
              />
              <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <FaShieldAlt /> TLS Encrypted Connection
              </p>
            </div>
          ) : (
            <div>
              <Input
                id="otp"
                label="One Time Password"
                value={aadhaarState.otp}
                onChange={(e) => {
                  setAadhaarState(s => ({ ...s, otp: e.target.value.replace(/\D/g, "").slice(0, 6) }));
                  clearCustomError("otp");
                }}
                errors={{ otp: getFieldError("otp") }}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                placeholder="xxxxxx"
              />
              <div className="mt-2 flex justify-between">
                <span className="text-xs text-gray-500">Sent to linked mobile</span>
                <button onClick={() => setAadhaarState(s => ({ ...s, refId: null, otp: "" }))} className="text-xs text-blue-600 underline">Change Number</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Bank Details</h3>
            <p className="text-sm text-gray-500">For secure payouts directly to your account.</p>
          </div>

          {userState?.bank_verified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-green-600 text-xl" />
                <p className="font-semibold text-green-900">Bank Verified</p>
              </div>
              <p className="ml-8 text-sm text-green-700 mt-1">Holder: {userState.bank_verified_name}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  id="accountHolderName"
                  label="Account Holder"
                  placeholder="As per bank records"
                  register={register("accountHolderName")}
                  errors={bankErrors}
                  required
                />
              </div>
              <Input
                id="accountNumber"
                label="Account Number"
                placeholder="Your Bank Account Number"
                register={register("accountNumber")}
                errors={bankErrors}
                required
                formatPrice={false}
                type="number"
              />
              <Input
                id="ifscCode"
                label="IFSC Code"
                placeholder="BANK0000001"
                register={register("ifscCode")}
                errors={bankErrors}
                required
                className="uppercase"
              />
              <Input
                id="bankName"
                label="Bank Name"
                placeholder="e.g. HDFC Bank"
                register={register("bankName")}
                errors={bankErrors}
                required
              />
              <Input
                id="gstin"
                label="GST Number"
                placeholder="11XXXXXXXXXX1Z0"
                register={register("gstin")}
                errors={bankErrors}
                
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <FaCheckCircle className="text-4xl text-green-600" />
        </div>
        <h3 className="text-2xl font-bold">All Set!</h3>
        <p className="text-gray-500 mt-2">You have successfully verified your profile.</p>
      </div>
    );
  };

  const renderStepProgress = () => (
    <div className="mb-8 px-4 flex justify-between relative">

      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 -translate-y-1/2" />

      {steps.map((s, _idx) => {
        const isComplete = step > s.id;
        const isActive = step === s.id;
        return (
          <div key={s.id} className={`flex flex-col items-center bg-white px-2 ${isActive ? 'scale-110 transition-transform' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 
                 ${isComplete ? "bg-green-600 border-green-600 text-white" : isActive ? "border-black bg-black text-white" : "border-gray-300 text-gray-400 bg-white"}`}>
              {isComplete ? <FaCheckCircle /> : s.id}
            </div>
            <span className={`text-xs mt-1 font-medium ${isActive ? "text-black" : "text-gray-400"}`}>{s.title}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verification Center"
      actionLabel={step === 3 ? "Complete" : step === 4 ? "Close" : "Continue"}
      onSubmit={step === 4 ? onClose : handleNextClick}
      disabled={loading}
      isLoading={loading}
      body={
        <div className="pt-2">
          {renderStepProgress()}
          {renderStep()}
        </div>
      }
    />
  );
};

export default VerificationModal;
