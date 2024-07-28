"use client";

import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";

import { signIn } from "next-auth/react";
import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";
import useAddonModal from "@/hook/useAddonModal";
import ImageUpload from "../inputs/ImageUpload";

type Props = {
    save:(value:{imageUrl?:string,name:string})=>void;
};

function CustomAddonModal({ save}: Props) {
  const addonModel = useAddonModal();
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<any>([]); // State to track password visibility

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
    save({name : data.name,imageUrl:image[0]});
    setImage([]);
  };



  return (
    <Modal
      disabled={isLoading}
      isOpen={addonModel.isOpen}
      title="Create your own"
      actionLabel="Continue"
      autoWidth={true}
      customWidth="w-full"
      onClose={addonModel.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <>
        <Input
            id="name"
            label="Name of addon"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
        />
        <br/>
        <ImageUpload
              onChange={(value) => { setImage(value); } }
              values={image} />
              </>
      }
    
    />
  );
}


export default CustomAddonModal;
