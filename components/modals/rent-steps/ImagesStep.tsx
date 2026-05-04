"use client";

import React from "react";

import FormField from "@/components/inputs/FormField";
import ImageUpload from "@/components/inputs/ImageUpload";
import Heading from "@/components/ui/Heading";

interface ImagesStepProps {
  imageSrc: string[];
  setCustomValue: (id: string, value: unknown) => void;
  imageError: string;
  setImageError: (error: string) => void;
}

const ImagesStep: React.FC<ImagesStepProps> = ({
  imageSrc,
  setCustomValue,
  imageError,
  setImageError,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="Add some photos of your space" subtitle="Show creators what your space looks like!" variant="h5" />
      <FormField label="Images" description="(Max 30)" align="start">
        <div className="w-full">
          <ImageUpload
            uid="rent-modal-upload"
            onChange={(value) => {
              setCustomValue("imageSrc", value);
              setImageError("");
            }}
            values={imageSrc || []}
          />
        </div>
      </FormField>
      {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
    </div>
  );
};

export default ImagesStep;
