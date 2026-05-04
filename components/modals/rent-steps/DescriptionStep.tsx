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
}

const DescriptionStep: React.FC<DescriptionStepProps> = ({
  register,
  errors,
  isLoading,
  watch,
  setValue,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="How would you describe your space?" subtitle="Short and sweet works best!" variant="h5" />
      <Input
        id="title"
        label="Title"
        disabled={isLoading}
        register={register("title")}
        errors={errors}
        required
      />
      <LexicalEditor
        label="Description"
        value={watch("description") || ""}
        onChange={(html) => setValue("description", html, { shouldDirty: true, shouldValidate: true })}
        placeholder="Describe your space..."
      />
      <Input
        id="price"
        label="Price (per hour)"
        formatPrice
        type="number"
        disabled={isLoading}
        register={register("price")}
        errors={errors}
        required
      />
    </div>
  );
};

export default DescriptionStep;
