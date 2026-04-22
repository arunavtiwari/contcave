"use client";
import React, { useCallback, useEffect, useState } from "react";
import { FaExclamationCircle, FaInfoCircle } from "react-icons/fa";

import Input from "@/components/inputs/Input";
import Modal from "@/components/modals/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone?: string, email?: string) => void;
  onLoadingStart?: () => void;
  initialEmail?: string;
  initialPhone?: string;
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string): boolean => /^\d{10}$/.test(phone);

const OwnerEnableModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoadingStart,
  initialEmail = "",
  initialPhone = ""
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);

  const [errors, setErrors] = useState<Record<string, { message: string }>>({});


  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setPhone(initialPhone);
      setErrors({});
    }
  }, [isOpen, initialEmail, initialPhone]);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleSubmit = () => {
    setErrors({});


    const newErrors: Record<string, { message: string }> = {};

    if (!email.trim()) {
      newErrors.email = { message: "Email is required" };
    } else if (!isValidEmail(email)) {
      newErrors.email = { message: "Please enter a valid email address" };
    }

    if (!phone.trim()) {
      newErrors.phone = { message: "Phone number is required" };
    } else if (!isValidPhone(phone)) {
      newErrors.phone = { message: "Please enter a 10-digit phone number" };
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }


    onClose();
    onLoadingStart?.();


    setTimeout(() => {
      onSuccess?.(phone, email);
    }, 300);
  };

  const body = (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            className={`w-full px-4 py-3 rounded-xl border transition-colors ${errors.email
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-border focus:border-foreground focus:ring-foreground/10"
              } focus:outline-none focus:ring-1`}
            placeholder="your.email@example.com"

          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1">
              <FaExclamationCircle className="w-3 h-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Phone Number <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="px-4 py-3 bg-muted border border-border rounded-xl text-muted-foreground font-medium whitespace-nowrap">
              +91
            </span>
            <Input
              id="owner-phone"
              type="number"
              value={phone}
              onNumberChange={(val) => {
                setPhone(val.toString().slice(0, 10));
                clearError("phone");
              }}
              placeholder="10-digit mobile number"
              maxLength={10}
              errors={errors as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            />
          </div>
          {errors.phone && (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1">
              <FaExclamationCircle className="w-3 h-3" />
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
          <FaInfoCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">What happens next?</p>
            <p className="text-xs text-muted-foreground/80">
              We will use these contact details to start the verification process. You'll need to verify your email, phone, Aadhaar, and bank details to complete your registration as a studio host.
            </p>
          </div>
        </div>

        {errors.submit && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2">
            <FaExclamationCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{errors.submit.message}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={onClose}
      onSubmitAction={handleSubmit}
      title="Ready to List Your Studio?"
      body={body}
      actionLabel="Continue to Verification"
      customWidth="max-w-2xl"
    />
  );
};

export default OwnerEnableModal;


