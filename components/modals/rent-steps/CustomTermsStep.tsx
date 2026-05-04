"use client";

import React from "react";

import LexicalEditor from "@/components/inputs/RichTextEditor";
import Heading from "@/components/ui/Heading";

interface CustomTermsStepProps {
  customTerms: string;
  setValue: (name: string, value: unknown, options?: unknown) => void;
}

const CustomTermsStep: React.FC<CustomTermsStepProps> = ({
  customTerms,
  setValue,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="Custom Terms & Conditions" subtitle="Add your own rules for the space (Optional)" variant="h5" />
      <LexicalEditor
        label="T&C by Host"
        value={customTerms || ""}
        onChange={(html) => setValue("customTerms", html, { shouldDirty: true, shouldValidate: true })}
        placeholder="e.g. No smoking, No pets, etc."
      />
    </div>
  );
};

export default CustomTermsStep;
