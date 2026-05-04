"use client";

import React from "react";

import AddonsSelection from "@/components/inputs/AddonsSelection";
import CustomAddonModal from "@/components/modals/CustomAddonModal";
import Heading from "@/components/ui/Heading";
import { Addon } from "@/types/addon";

interface AddonsStepProps {
  selectedAddons: Addon[];
  addonsData: Addon[];
  handleAddonChange: (v: Addon[]) => void;
  setValue: (name: string, value: unknown, options?: unknown) => void;
}

const AddonsStep: React.FC<AddonsStepProps> = ({
  selectedAddons,
  addonsData,
  handleAddonChange,
  setValue,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <Heading title="Addons" subtitle="Optional services creators can book" variant="h5" />
        <CustomAddonModal
          save={(value) => {
            const updated = [
              ...(selectedAddons || []),
              { ...value, price: 0, qty: 0, imageUrl: value.imageUrl ?? "" },
            ];
            setValue("addons", updated, { shouldDirty: true });
          }}
        />
      </div>
      <AddonsSelection
        addons={addonsData}
        initialSelectedAddons={selectedAddons || []}
        onSelectedAddonsChange={handleAddonChange}
        rentModal
      />
    </div>
  );
};

export default AddonsStep;
