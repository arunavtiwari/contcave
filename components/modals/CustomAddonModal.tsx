"use client";

import Image from "next/image";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";

import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/inputs/Input";
import useAddonModal from "@/hook/useAddonModal";

import Modal from "./Modal";

type Props = {
  save: (value: { imageUrl?: string, name: string }) => void;
};

function CustomAddonModal({ save }: Props) {
  const addonModel = useAddonModal();

  const [image, setImage] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {

      name: ""
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    addonModel.onClose();
    save({ name: data.name, imageUrl: image[image.length - 1] });
    setImage([]);
  };

  return (
    <Modal

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

              register={register("name", {
                required: "Name of Add-on required",
              })}
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
