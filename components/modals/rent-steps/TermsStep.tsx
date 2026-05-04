"use client";

import React from "react";

import TermsAndConditionsModal, { SignatureMeta, TermsRef } from "@/components/inputs/TermsAndConditions";
import Heading from "@/components/ui/Heading";

interface TermsStepProps {
  terms: boolean;
  agreementSignature: SignatureMeta | null;
  termsRef: React.RefObject<TermsRef | null>;
  handleTermsAndConditions: (accept: boolean) => void;
  handleSignature: (sig: SignatureMeta) => void;
}

const TermsStep: React.FC<TermsStepProps> = ({
  terms,
  agreementSignature,
  termsRef,
  handleTermsAndConditions,
  handleSignature,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="Review and accept terms" subtitle="Finalize your listing" variant="h5" />
      <TermsAndConditionsModal
        ref={termsRef}
        checked={terms}
        onChange={handleTermsAndConditions}
        onSignature={handleSignature}
        onAgreementPdf={() => {}} // Not needed here as we handle it during submission
        value={agreementSignature}
      />
    </div>
  );
};

export default TermsStep;
