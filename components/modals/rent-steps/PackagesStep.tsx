"use client";

import React from "react";

import PackagesForm from "@/components/inputs/PackagesForm";
import { SetEditorItem } from "@/components/inputs/SetsEditor";
import Heading from "@/components/ui/Heading";
import { Package } from "@/types/package";

interface PackagesStepProps {
  packages: Package[];
  hasSets: boolean;
  sets: SetEditorItem[];
  setValue: (name: string, value: unknown, options?: unknown) => void;
}

const PackagesStep: React.FC<PackagesStepProps> = ({
  packages,
  hasSets,
  sets,
  setValue,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="Create Packages" subtitle="Offer bundles at a discounted price" variant="h5" />
      <PackagesForm
        value={packages || []}
        onChange={(v) => setValue("packages", v, { shouldDirty: true, shouldValidate: true })}
        availableSets={hasSets ? (sets as never) : []}
      />
    </div>
  );
};

export default PackagesStep;
