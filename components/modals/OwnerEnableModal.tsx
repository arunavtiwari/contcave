"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "./Modal";
import { FaExclamationCircle, FaInfoCircle, FaSpinner } from "react-icons/fa";

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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or initial values change
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

  const handleSubmit = async () => {
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhone(phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors before submitting");
      return;
    }

    // Close modal immediately and trigger loading overlay
    onClose();
    onLoadingStart?.();

    // Call onSuccess after a brief delay to allow modal to close
    setTimeout(() => {
      onSuccess?.(phone, email);
    }, 300);
  };

  const body = (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${errors.email
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              } focus:outline-none focus:ring-2`}
            placeholder="your.email@example.com"
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <FaExclamationCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium whitespace-nowrap">
              +91
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(value);
                clearError("phone");
              }}
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${errors.phone
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                } focus:outline-none focus:ring-2`}
              placeholder="10-digit mobile number"
              maxLength={10}
              disabled={loading}
            />
          </div>
          {errors.phone && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <FaExclamationCircle className="w-3 h-3" />
              {errors.phone}
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <FaInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">What happens next?</p>
            <p className="text-xs text-blue-700">
              We will use these contact details to start the verification process. You'll need to verify your email, phone, Aadhaar, and bank details to complete your registration as a studio host.
            </p>
          </div>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <FaExclamationCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Register as Studio Host"
      body={body}
      actionLabel="Continue to Verification"
      disabled={loading}
      customWidth="max-w-2xl"
    />
  );
};

export default OwnerEnableModal;
