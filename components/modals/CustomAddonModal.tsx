"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/ui/Input";
import useAddonModal from "@/hook/useAddonModal";
import { uploadToR2 } from "@/lib/storage/upload";

import Modal from "./Modal";

const customAddonSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type CustomAddonFormValues = z.infer<typeof customAddonSchema>;

type Props = {
  save: (value: { imageUrl: string; name: string }) => void;
};

function CustomAddonModal({ save }: Props) {
  const addonModel = useAddonModal();

  const [image, setImage] = useState<string[]>([]);
  const [addonFile, setAddonFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CustomAddonFormValues>({
    resolver: zodResolver(customAddonSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit: SubmitHandler<CustomAddonFormValues> = async (data) => {
    if (image.length === 0 || !addonFile) {
      toast.error("Please upload an image for the add-on");
      return;
    }

    setIsUploading(true);
    try {
      const [uploadedUrl] = await uploadToR2([addonFile], "addons");
      save({ name: data.name, imageUrl: uploadedUrl });
      addonModel.onClose();
      reset();
      setImage([]);
      setAddonFile(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      customWidth="w-full max-w-md"
      customHeight="h-auto max-h-[600px]"
      nestedModal={true}
      isOpen={addonModel.isOpen}
      title="Create Add-On"
      actionLabel={isUploading ? "Uploading..." : "Create"}
      disabled={isUploading}
      onClose={addonModel.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <>
          <div className="flex flex-col gap-4 items-center">
            <Input
              id="name"
              label="Name of Add-on"
              placeholder="e.g. Smoke Machine"
              register={register("name")}
              errors={errors}
              required
            />
            <div className="flex items-center gap-4">
              {image.length > 0 && (
                <Image
                  src={image[image.length - 1]}
                  alt="Uploaded Add-on"
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-xl border border-neutral-300 object-cover"
                  unoptimized
                />
              )}

              <ImageUpload
                uid="addon-image-upload"
                onChange={(value) => setImage(value.slice(-1))}
                values={[]}
                deferUpload
                onFilesChange={(files) => {
                  if (files.length > 0) setAddonFile(files[files.length - 1]);
                }}
              />
            </div>
          </div>
        </>
      }
    />
  );
}


export default CustomAddonModal;
