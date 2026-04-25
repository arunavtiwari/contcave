"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { toast } from "sonner";

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
  unifiedVerificationSchema,
  type UnifiedVerificationValues
} from "@/schemas/verification";
import { SafeUser } from "@/types/user";

type Props = {
  isOpen: boolean;
  onCloseAction: () => void;
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
  onCloseAction,
  currentUser,
  onComplete,
}) => {
  const [userState, setUserState] = useState<SafeUser | null>(currentUser);
  const [step, setStep] = useState(getInitialStep(currentUser));
  const [isPending, startTransition] = useTransition();
  const [aadhaarRefId, setAadhaarRefId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<UnifiedVerificationValues>({
    resolver: zodResolver(unifiedVerificationSchema),
    defaultValues: {
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      aadhaarNumber: currentUser?.aadhaar_last4 ? "********" + currentUser.aadhaar_last4 : "",
      otp: "",
      accountHolderName: currentUser?.bank_verified_name || "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      gstNumber: "",
    },
    mode: "onBlur"
  });

  const emailValue = watch("email");
  const phoneValue = watch("phone");
  const aadhaarNumber = watch("aadhaarNumber");
  const otpValue = watch("otp");

  useEffect(() => {
    if (isOpen && currentUser) {
      setUserState(currentUser);
      setStep(getInitialStep(currentUser));
      setAadhaarRefId(null);
      reset({
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        aadhaarNumber: currentUser.aadhaar_last4 ? "********" + currentUser.aadhaar_last4 : "",
        otp: "",
        accountHolderName: currentUser.bank_verified_name || "",
        accountNumber: "",
        bankName: "",
        ifscCode: "",
        gstNumber: "",
      });
    }
  }, [isOpen, currentUser, reset]);

  const verifyEmail = async () => {
    startTransition(async () => {
      try {
        const resp = await verifyEmailAction(emailValue);
        if (resp?.data?.result === "undeliverable") {
          toast.error("Email address is not deliverable");
          return;
        }

        const updatedUser = await updateVerificationStepAction({ step: "email" });
        setUserState(updatedUser as SafeUser);
        toast.success("Email verified successfully");
      } catch (_err: unknown) {
        toast.error("Email verification failed");
      }
    });
  };

  const verifyPhone = async () => {
    startTransition(async () => {
      try {
        const updatedUser = await updateVerificationStepAction({
          step: "phone",
          phone: phoneValue,
        });
        setUserState(updatedUser as SafeUser);
        toast.success("Phone verified successfully");
      } catch (_err: unknown) {
        toast.error("Phone verification failed");
      }
    });
  };

  const handleGenerateOtp = async () => {
    const cleaned = (aadhaarNumber || "").replace(/\s/g, "");
    if (!/^\d{12}$/.test(cleaned)) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return;
    }

    startTransition(async () => {
      try {
        const resp = await generateAadhaarOtpAction(cleaned);
        if (resp.success) {
          setAadhaarRefId(resp.data.ref_id);
          toast.success("OTP sent to your linked mobile number");
        } else {
          toast.error(resp.error || "Failed to send OTP");
        }
      } catch (_err: unknown) {
        toast.error("Failed to connect to verification server");
      }
    });
  };

  const handleVerifyOtp = async () => {
    if (!aadhaarRefId) return;
    if (!/^\d{6}$/.test(otpValue || "")) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    startTransition(async () => {
      try {
        const verifyResp = await verifyAadhaarOtpAction(aadhaarRefId, otpValue!);
        if (verifyResp.success) {
          const updatedUser = await updateVerificationStepAction({
            step: "aadhaar",
            aadhaarRefId: aadhaarRefId,
            aadhaarLast4: aadhaarNumber!.slice(-4),
          });
          setUserState(updatedUser as SafeUser);
          toast.success("Aadhaar identity confirmed");
          setStep(3);
        } else {
          toast.error(verifyResp.error || "OTP verification failed");
        }
      } catch (_err: unknown) {
        toast.error("Verification server error");
      }
    });
  };

  const onFinalSubmit = async (data: UnifiedVerificationValues) => {
    startTransition(async () => {
      try {
        const vendorId = generateVendorId();
        await createVendorAction({
          vendor_id: vendorId,
          display_name: userState?.name || data.accountHolderName,
          email: userState?.email,
          phone: String(data.phone),
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
        });

        const updatedUser = await updateVerificationStepAction({
          step: "bank",
          bankVerifiedName: data.accountHolderName,
          vendorId: vendorId,
          accountNumber: String(data.accountNumber),
          ifscCode: data.ifscCode.toUpperCase(),
          bankName: data.bankName,
          gstin: data.gstNumber || undefined,
        });

        setUserState(updatedUser as SafeUser);
        toast.success("Bank verification complete! Profile fully verified.");
        onComplete?.();
        onCloseAction();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bank verification failed");
      }
    });
  };

  const handleNextClick = () => {
    if (step === 1) {
      if (!userState?.email_verified) return toast.error("Please verify email first");
      if (!userState?.phone_verified) return toast.error("Please verify phone first");
      setStep(2);
    } else if (step === 2) {
      if (userState?.aadhaar_verified) {
        setStep(3);
      } else if (!aadhaarRefId) {
        handleGenerateOtp();
      } else {
        handleVerifyOtp();
      }
    } else if (step === 3) {
      handleSubmit(onFinalSubmit)();
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
                type="email"
                required
                register={register("email")}
                errors={errors}
                disabled={!!userState?.email_verified || isPending}
                className={userState?.email_verified ? "border-success bg-success/10 text-success-900" : ""}
              />
            </div>
            <div className="min-w-30">
              <Button
                label={userState?.email_verified ? "Verified" : "Verify"}
                variant={userState?.email_verified ? "success" : "default"}
                onClick={verifyEmail}
                loading={isPending}
                disabled={!!userState?.email_verified || !emailValue}
              />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                id="phone"
                label="Phone"
                type="number"
                required
                onNumberChange={(val) => setValue("phone", val.toString().slice(0, 10))}
                register={register("phone")}
                errors={errors}
                disabled={!!userState?.phone_verified || isPending}
                className={userState?.phone_verified ? "border-success bg-success/10 text-success-900" : ""}
              />
            </div>
            <div className="min-w-30">
              <Button
                label={userState?.phone_verified ? "Verified" : "Verify"}
                variant={userState?.phone_verified ? "success" : "default"}
                onClick={verifyPhone}
                loading={isPending}
                disabled={!!userState?.phone_verified || !phoneValue}
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

          {userState?.aadhaar_verified ? (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-6 flex items-center gap-4">
              <FaCheckCircle className="text-success text-2xl" />
              <div>
                <Heading title="Aadhaar Verified" variant="h6" className="text-success-900" />
                <p className="text-sm text-success-700 font-medium">Identity confirmed securely.</p>
              </div>
            </div>
          ) : !aadhaarRefId ? (
            <div>
              <Input
                id="aadhaar"
                label="Aadhaar Number"
                type="number"
                required
                onNumberChange={(val) => setValue("aadhaarNumber", val.toString().slice(0, 12))}
                register={register("aadhaarNumber")}
                errors={errors}
                disabled={isPending}
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
                type="number"
                required
                onNumberChange={(val) => setValue("otp", val.toString().slice(0, 6))}
                register={register("otp")}
                errors={errors}
                disabled={isPending}
                className="text-center text-lg tracking-widest font-mono"
                placeholder="xxxxxx"
              />
              <div className="mt-2 flex justify-between">
                <span className="text-xs text-muted-foreground">Sent to linked mobile</span>
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarRefId(null);
                    setValue("otp", "");
                  }}
                  className="text-xs text-foreground font-semibold underline disabled:opacity-50"
                  disabled={isPending}
                >
                  Change Number
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
                  required
                  register={register("accountHolderName")}
                  errors={errors}
                  disabled={isPending}
                />
              </div>
              <Input
                id="accountNumber"
                label="Account Number"
                type="number"
                required
                onNumberChange={(val) => setValue("accountNumber", val.toString())}
                register={register("accountNumber")}
                errors={errors}
                disabled={isPending}
                placeholder="Your Bank Account Number"
              />
              <Input
                id="ifscCode"
                label="IFSC Code"
                required
                register={register("ifscCode")}
                errors={errors}
                disabled={isPending}
                placeholder="BANK0000001"
                className="uppercase"
              />
              <Input
                id="bankName"
                label="Bank Name"
                required
                register={register("bankName")}
                errors={errors}
                disabled={isPending}
                placeholder="e.g. HDFC Bank"
              />
              <Input
                id="gstNumber"
                label="GST Number"
                register={register("gstNumber")}
                errors={errors}
                disabled={isPending}
                placeholder="11XXXXXXXXXX1Z0"
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
      {steps.map((s) => {
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
      onCloseAction={onCloseAction}
      title="Verification Center"
      actionLabel={step === 3 ? "Complete" : step === 4 ? "Close" : "Continue"}
      onSubmitAction={step === 4 ? onCloseAction : handleNextClick}
      disabled={isPending}
      isLoading={isPending}
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



