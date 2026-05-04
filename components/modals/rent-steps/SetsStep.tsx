"use client";

import React from "react";

import FormField from "@/components/inputs/FormField";
import SetsEditor from "@/components/inputs/SetsEditor";
import { SetEditorItem } from "@/components/inputs/SetsEditor";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { AdditionalSetPricingType } from "@/types/set";

interface SetsStepProps {
  hasSets: boolean;
  sets: SetEditorItem[];
  additionalSetPricingType: AdditionalSetPricingType | null;
  setsHaveSamePrice: boolean;
  unifiedSetPrice: number | null;
  setsError: string;
  setCustomValue: (id: string, value: unknown) => void;
  setSetsError: (error: string) => void;
}

const SetsStep: React.FC<SetsStepProps> = ({
  hasSets,
  sets,
  additionalSetPricingType,
  setsHaveSamePrice,
  unifiedSetPrice,
  setsError,
  setCustomValue,
  setSetsError,
}) => {
  if (!hasSets) return null;

  return (
    <div className="flex flex-col gap-6">
      <Heading title="Manage Sets" subtitle="Configure individual rooms or areas" variant="h5" />
      
      <FormField label="Pricing Type" variant="horizontal">
        <div className="flex gap-4 w-full">
          <Button
            onClick={() => {
              setCustomValue("additionalSetPricingType", "FIXED");
              setSetsError("");
            }}
            variant={additionalSetPricingType === "FIXED" ? "default" : "outline"}
            label="Fixed Add-on"
            fit
            className="flex-1"
          />
          <Button
            onClick={() => {
              setCustomValue("additionalSetPricingType", "HOURLY");
              setSetsError("");
            }}
            variant={additionalSetPricingType === "HOURLY" ? "default" : "outline"}
            label="Hourly Add-on"
            fit
            className="flex-1"
          />
        </div>
      </FormField>

      <FormField label="Will all sets have the same price?" variant="horizontal">
        <div className="flex gap-4 w-full">
          <label
            className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${
              setsHaveSamePrice === true
                ? "border-foreground bg-muted ring-1 ring-foreground/10"
                : "border-border hover:border-border/80"
            }`}
          >
            <input
              type="radio"
              checked={setsHaveSamePrice === true}
              onChange={() => setCustomValue("setsHaveSamePrice", true)}
              className="hidden"
            />
            <div className="font-medium text-center">Yes, same price</div>
          </label>
          <label
            className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${
              setsHaveSamePrice === false
                ? "border-foreground bg-muted ring-1 ring-foreground/10"
                : "border-border hover:border-border/80"
            }`}
          >
            <input
              type="radio"
              checked={setsHaveSamePrice === false}
              onChange={() => setCustomValue("setsHaveSamePrice", false)}
              className="hidden"
            />
            <div className="font-medium text-center">No, different prices</div>
          </label>
        </div>
      </FormField>

      <SetsEditor
        sets={sets || []}
        onChange={(updated) => {
          setCustomValue("sets", updated);
          setSetsError("");
        }}
        pricingType={additionalSetPricingType}
        isPricingUniform={setsHaveSamePrice}
        uniformPrice={unifiedSetPrice}
        onUniformPriceChange={(p) => setCustomValue("unifiedSetPrice", p)}
      />
      {setsError && <p className="text-destructive text-sm mt-1">{setsError}</p>}
    </div>
  );
};

export default SetsStep;
