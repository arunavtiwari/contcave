"use client";

import { FiAlertCircle } from "react-icons/fi";

import SetsEditor from "@/components/inputs/SetsEditor";
import { SAME_PRICE_OPTIONS, samePriceChoice, SetEditorItem } from "@/components/inputs/SetsEditor";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Heading from "@/components/ui/Heading";
import RadioGroup from "@/components/ui/RadioGroup";
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
    <div className="flex flex-col gap-4">
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
        <RadioGroup
          layout="cards"
          aria-label="Will all sets have the same price?"
          options={SAME_PRICE_OPTIONS}
          value={samePriceChoice(setsHaveSamePrice)}
          onChange={(v) => setCustomValue("setsHaveSamePrice", v === "yes")}
        />
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
      {setsError && (
        <div role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-in fade-in-50 slide-in-from-top-0.5">
          <FiAlertCircle className="size-3.5 shrink-0 stroke-[2.25]" />
          <span>{setsError}</span>
        </div>
      )}
    </div>
  );
};

export default SetsStep;
