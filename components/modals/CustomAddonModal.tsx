"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/ui/Input";
import useAddonModal from "@/hook/useAddonModal";

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

  const onSubmit: SubmitHandler<CustomAddonFormValues> = (data) => {
    if (image.length === 0) {
      toast.error("Please upload an image for the add-on");
      return;
    }
    save({ name: data.name, imageUrl: image[image.length - 1] });
    addonModel.onClose();
    reset();
    setImage([]);
  };

  return (
    <Modal
      customWidth="w-full max-w-md"
      customHeight="h-auto max-h-[600px]"
      nestedModal={true}
      isOpen={addonModel.isOpen}
      title="Create Add-On"
      actionLabel="Create"
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
                  className="rounded-xl border border-neutral-300"
                />
              )}

              <ImageUpload
                onChange={(value) => setImage(value)}
                values={image}
              />
            </div>
          </div>
        </>

      }

    />
  );
}


export default CustomAddonModal;
