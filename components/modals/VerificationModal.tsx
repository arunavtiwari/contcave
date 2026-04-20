"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";

import {
  createVendorAction,
  generateAadhaarOtpAction,
  updateVerificationStepAction,
  verifyAadhaarOtpAction,
  verifyEmailAction
} from "@/app/actions/verificationActions";
import Input from "@/components/inputs/Input";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import {
  aadhaarSchema,
  BankSchema,
  bankSchema,
  otpSchema,
  phoneVerificationSchema,
} from "@/schemas/verification";
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
      gstNumber: "",
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
        gstNumber: "",
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
      const resp = await verifyEmailAction(emailState.value);
      if (resp?.data?.result === "undeliverable") {
        setEmailState((s) => ({ ...s, verified: false, checking: false }));
        setCustomErrors({ email: "Email address is not deliverable" });
        return;
      }

      const updatedUser = await updateVerificationStepAction({ step: "email" });
      setUserState(updatedUser as SafeUser);
      setEmailState((s) => ({ ...s, verified: true, checking: false }));
      toast.success("Email verified successfully");
    } catch (err: unknown) {
      console.error("Email verify error:", err);
      setEmailState((s) => ({ ...s, verified: false, checking: false }));
      const message = err instanceof Error ? err.message : "Email verification failed";
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
      const updatedUser = await updateVerificationStepAction({
        step: "phone",
        phone: phoneState.phoneValue,
      });
      setUserState(updatedUser as SafeUser);
      setPhoneState((s) => ({
        ...s,
        verified: true,
        checking: false,
        phoneValue: (updatedUser as SafeUser).phone || phoneState.phoneValue,
      }));
      toast.success("Phone verified");
    } catch (err: unknown) {
      setPhoneState((s) => ({ ...s, verified: false, checking: false }));
      const message = err instanceof Error ? err.message : "Phone verification failed";
      setCustomErrors({ phone: message });
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
      const resp = await generateAadhaarOtpAction(cleaned);
      if (resp.success) {
        setAadhaarState((s) => ({ ...s, refId: resp.data.ref_id }));
        toast.success("OTP sent");
      } else {
        setCustomErrors({ aadhaar: resp.error || "Failed to send OTP" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setCustomErrors({ aadhaar: message });
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
      const verifyResp = await verifyAadhaarOtpAction(aadhaarState.refId, aadhaarState.otp);

      if (verifyResp.success) {
        const updatedUser = await updateVerificationStepAction({
          step: "aadhaar",
          aadhaarRefId: aadhaarState.refId,
          aadhaarLast4: aadhaarState.aadhaarNumber.slice(-4),
        });
        setUserState(updatedUser as SafeUser);
        setAadhaarState((s) => ({ ...s, verified: true }));
        toast.success("Aadhaar Verified");
        setStep(3);
      } else {
        setCustomErrors({ otp: verifyResp.error || "Verification failed" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setCustomErrors({ otp: message });
    } finally {
      setLoading(false);
    }
  };


  const onBankSubmit = async (data: BankSchema) => {
    setLoading(true);
    try {
      const vendorPayload = {
        vendor_id: generateVendorId(),
        display_name: userState?.name || data.accountHolderName,
        email: userState?.email,
        phone: String(phoneState.phoneValue),
        bank: {
          account_holder: data.accountHolderName,
          account_number: data.accountNumber,
          ifsc: data.ifscCode,
        },
        kyc_details: {
          account_type: "BUSINESS",
          business_type: "B2B",
          ...(data.gstNumber && { gst: data.gstNumber }),
        },
      };

      await createVendorAction(vendorPayload);

      const updatedUser = await updateVerificationStepAction({
        step: "bank",
        bankVerifiedName: data.accountHolderName,
        vendorId: vendorPayload.vendor_id,
        accountNumber: String(data.accountNumber),
        ifscCode: data.ifscCode.toUpperCase(),
        bankName: data.bankName,
        gstin: data.gstNumber || undefined,
      });

      setUserState(updatedUser as SafeUser);
      toast.success("Bank Verified!");
      onComplete?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bank verification failed";
      toast.error(message);
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
            <Heading title="Contact Info" variant="h5" />
            <p className="text-sm text-muted-foreground">Verify email and phone to continue.</p>
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
                className={emailState.verified ? "border-success bg-success/10 text-success-900" : ""}
              />
            </div>
            <div className="min-w-30">
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
                className={phoneState.verified ? "border-success bg-success/10 text-success-900" : ""}
              />
            </div>
            <div className="min-w-30">
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
            <Heading title="Aadhaar KYC" variant="h5" />
            <p className="text-sm text-muted-foreground">Secure identity verification.</p>
          </div>

          {aadhaarState.verified || userState?.aadhaar_verified ? (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-6 flex items-center gap-4">
              <FaCheckCircle className="text-success text-2xl" />
              <div>
                <Heading title="Aadhaar Verified" variant="h6" className="text-success-900" />
                <p className="text-sm text-success-700 font-medium">Identity confirmed securely.</p>
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
              <p className="mt-2 text-xs text-muted-foreground/60 flex items-center gap-1">
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
                <span className="text-xs text-muted-foreground">Sent to linked mobile</span>
                <button onClick={() => setAadhaarState(s => ({ ...s, refId: null, otp: "" }))} className="text-xs text-foreground font-semibold underline">Change Number</button>
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
            <Heading title="Bank Details" variant="h5" />
            <p className="text-sm text-muted-foreground">For secure payouts directly to your account.</p>
          </div>

          {userState?.bank_verified ? (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-success text-2xl" />
                <Heading title="Bank Verified" variant="h6" className="text-success-900" />
              </div>
              <p className="ml-9 text-sm text-success-700 font-medium mt-1">Holder: {userState.bank_verified_name}</p>
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
                id="gstNumber"
                label="GST Number"
                placeholder="11XXXXXXXXXX1Z0"
                register={register("gstNumber")}
                errors={bankErrors}

              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="bg-success/10 p-5 rounded-full mb-6">
          <FaCheckCircle className="text-5xl text-success" />
        </div>
        <Heading title="All Set!" variant="h4" className="mb-2" />
        <p className="text-muted-foreground font-medium">You have successfully verified your profile.</p>
      </div>
    );
  };

  const renderStepProgress = () => (
    <div className="mb-8 px-4 flex justify-between relative">

      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10 -translate-y-1/2" />

      {steps.map((s, _idx) => {
        const isComplete = step > s.id;
        const isActive = step === s.id;
        return (
          <div key={s.id} className={`flex flex-col items-center bg-background px-2 ${isActive ? 'scale-110 transition-transform' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                 ${isComplete ? "bg-success border-success text-success-foreground" : isActive ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground bg-background"}`}>
              {isComplete ? <FaCheckCircle size={18} /> : s.id}
            </div>
            <span className={`text-xs mt-1 font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
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


