"use client";

import Image from "next/image";
import React from "react";
import { IoMdClose } from "react-icons/io";

import ImageUpload from "@/components/inputs/ImageUpload";
import FormField from "@/components/ui/FormField";
import Heading from "@/components/ui/Heading";
import MediaButton from "@/components/ui/MediaButton";

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
    <div className="flex flex-col gap-4">
      <Heading title="Add some photos of your space" subtitle="Show creators what your space looks like!" variant="h5" />
      <FormField label="Images" description="(Max 30)" align="start" error={imageError}>
        <div className="w-full flex flex-col gap-4">
          <ImageUpload
            uid="rent-modal-upload"
            onChange={(value) => {
              setCustomValue("imageSrc", value);
              setImageError("");
            }}
            values={imageSrc || []}
            className="w-full h-48 p-4 border border-border"
          />
          {imageSrc && imageSrc.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {imageSrc.map((src, index) => (
                <div key={index} className="relative group w-full aspect-square">
                  <Image fill sizes="(max-width: 768px) 50vw, 250px" src={src} alt={`Upload ${index + 1}`} className="object-cover rounded-xl border border-border" />
                  <MediaButton icon={IoMdClose} tone="dark" size="xs" reveal aria-label="Remove photo"
                    onClick={() => {
                      const newImages = [...imageSrc];
                      newImages.splice(index, 1);
                      setCustomValue("imageSrc", newImages);
                    }}
                    className="absolute top-2 right-2 z-10" />
                </div>
              ))}
            </div>
          )}
        </div>
      </FormField>
    </div>
  );
};

export default ImagesStep;
