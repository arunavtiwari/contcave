"use client";

import React from "react";
import { FiAlertCircle } from "react-icons/fi";

import SpaceVerification, { VerificationPayload } from "@/components/inputs/SpaceVerification";
import Heading from "@/components/ui/Heading";

interface VerificationStepProps {
  verifications: VerificationPayload;
  verificationError: string;
  handleVerificationChange: (v: VerificationPayload) => void;
}

const VerificationStep: React.FC<VerificationStepProps> = ({
  verifications,
  verificationError,
  handleVerificationChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="Verify your space" subtitle="Upload documents to verify your space ownership" variant="h5" />
      <SpaceVerification
        onVerification={handleVerificationChange}
        initialDocuments={verifications?.documents || []}
      />
      {verificationError && (
        <div role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-in fade-in-50 slide-in-from-top-0.5">
          <FiAlertCircle className="size-3.5 shrink-0 stroke-[2.25]" />
          <span>{verificationError}</span>
        </div>
      )}
    </div>
  );
};

export default VerificationStep;
