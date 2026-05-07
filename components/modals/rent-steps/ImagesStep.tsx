"use client";

import Image from "next/image";
import React from "react";
import { IoMdClose } from "react-icons/io";

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
    <div className="flex flex-col gap-4">
      <Heading title="Add some photos of your space" subtitle="Show creators what your space looks like!" variant="h5" />
      <FormField label="Images" description="(Max 30)" align="start">
        <div className="w-full flex flex-col gap-4">
          <ImageUpload
            uid="rent-modal-upload"
            onChange={(value) => {
              setCustomValue("imageSrc", value);
              setImageError("");
            }}
            values={imageSrc || []}
            deferUpload={true}
            className="w-full h-48 p-4 border border-border"
          />
          {imageSrc && imageSrc.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {imageSrc.map((src, index) => (
                <div key={index} className="relative group w-full aspect-square">
                  <Image fill src={src} alt={`Upload ${index + 1}`} className="object-cover rounded-xl border border-border" />
                  <button
                    onClick={() => {
                      const newImages = [...imageSrc];
                      newImages.splice(index, 1);
                      setCustomValue("imageSrc", newImages);
                    }}
                    className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                  >
                    <IoMdClose size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormField>
      {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
    </div>
  );
};

export default ImagesStep;
