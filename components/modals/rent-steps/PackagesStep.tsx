"use client";

import React from "react";

import PackagesForm from "@/components/inputs/PackagesForm";
import { SetEditorItem } from "@/components/inputs/SetsEditor";
import Heading from "@/components/ui/Heading";
import type { EquipmentItem } from "@/lib/listing/equipment";
import { Package } from "@/types/package";

interface PackagesStepProps {
  packages: Package[];
  hasSets: boolean;
  sets: SetEditorItem[];
  setValue: (name: string, value: unknown, options?: unknown) => void;
  error?: string;
  equipmentItems?: EquipmentItem[];
}

const PackagesStep: React.FC<PackagesStepProps> = ({
  packages,
  hasSets,
  sets,
  setValue,
  error,
  equipmentItems = [],
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="Create Packages" subtitle="Offer bundles at a discounted price" variant="h5" />
      <PackagesForm
        value={packages || []}
        onChange={(v) => setValue("packages", v, { shouldDirty: true, shouldValidate: true })}
        availableSets={hasSets ? (sets as never) : []}
        required={hasSets}
        equipmentItems={equipmentItems}
        error={error}
      />
    </div>
  );
};

export default PackagesStep;
