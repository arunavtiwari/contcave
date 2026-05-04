"use client";

import React from "react";

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
    <div className="flex flex-col gap-8">
      <Heading title="Verify your space" subtitle="Upload documents to verify your space ownership" variant="h5" />
      <SpaceVerification
        onVerification={handleVerificationChange}
        initialDocuments={verifications?.documents || []}
      />
      {verificationError && <p className="text-destructive text-sm mt-1">{verificationError}</p>}
    </div>
  );
};

export default VerificationStep;
