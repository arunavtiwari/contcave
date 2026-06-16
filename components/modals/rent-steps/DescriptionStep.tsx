"use client";

import React from "react";
import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

import Input from "@/components/inputs/Input";
import LexicalEditor from "@/components/inputs/RichTextEditor";
import Heading from "@/components/ui/Heading";
import { ListingSchema } from "@/schemas/listing";

type RentModalFormValues = ListingSchema;

interface DescriptionStepProps {
  register: UseFormRegister<RentModalFormValues>;
  errors: FieldErrors<RentModalFormValues>;
  isLoading: boolean;
  watch: UseFormWatch<RentModalFormValues>;
  setValue: UseFormSetValue<RentModalFormValues>;
  listingType?: "STANDARD" | "CURATED";
}

const DescriptionStep: React.FC<DescriptionStepProps> = ({
  register,
  errors,
  isLoading,
  watch,
  setValue,
  listingType = "STANDARD",
}) => {
  const isCurated = listingType === "CURATED";

  return (
    <div className="flex flex-col gap-4">
      <Heading title="Describe your space" subtitle="Keep it clear and concise." variant="h5" />
      <Input
        id="title"
        label="Studio Name / Title"
        disabled={isLoading}
        register={register("title")}
        errors={errors}
        placeholder="e.g. The White Loft Studio"
        required
      />
      <LexicalEditor
        label="Description"
        value={watch("description") || ""}
        onChange={(html) => setValue("description", html, { shouldDirty: true, shouldValidate: true })}
        placeholder="Describe your studio — lighting, size, what it's best suited for..."
      />
      {isCurated ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="priceRangeMin"
            label="Est. Price Min (₹/hr)"
            formatPrice
            type="number"
            disabled={isLoading}
            register={register("priceRangeMin")}
            errors={errors}
            placeholder="800"
          />
          <Input
            id="priceRangeMax"
            label="Est. Price Max (₹/hr)"
            formatPrice
            type="number"
            disabled={isLoading}
            register={register("priceRangeMax")}
            errors={errors}
            placeholder="1500"
          />
          <p className="col-span-2 text-xs text-muted-foreground -mt-2">
            Optional — leave blank to show &ldquo;Price on Demand&rdquo;.
          </p>
        </div>
      ) : (
        <Input
          id="price"
          label="Price per hour"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register("price")}
          errors={errors}
          required
        />
      )}
    </div>
  );
};

export default DescriptionStep;
