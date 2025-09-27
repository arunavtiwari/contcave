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
const isValidAadhaar = (aadhaarNumber: string) => /^[2-9]{1}[0-9]{11}$/.test(aadhaarNumber);
const isValidOtp = (otp: string) => /^[0-9]{6}$/.test(otp);
const isValidIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

// Vendor ID generator
const generateVendorId = () => `vendor_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const getInitialStep = (user: any) => {
  if (!user.phone_verified || !user.email_verified) return 1;
  if (!user.aadhaar_verified) return 2;
  if (!user.bank_verified) return 3;
  return 4;
};

const VerificationModal: React.FC<Props> = ({ isOpen, onClose, currentUser, onComplete }) => {
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
    aadhaarNumber: currentUser?.aadhaar_last4 ? "********" + currentUser?.aadhaar_last4 : "",
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
        aadhaarNumber: currentUser?.aadhaar_last4 ? "********" + currentUser?.aadhaar_last4 : "",
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
      const resp = await axios.post("/api/verify_email", { email: emailState.value });
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
          toast.error("Invalid OTP");
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

  const handleBack = () => step > 1 && setStep((s) => s - 1);

  // Render omitted for brevity (use your JSX with inputs/buttons)
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Host Verification"
      onSubmit={handleNext}
      actionLabel={step === 3 ? "Finish" : "Next"}
      customWidth="max-w-2xl"
      body={<div>{/* keep your renderStep UI */}</div>}
    />
  );
};

export default VerificationModal;
