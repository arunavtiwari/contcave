"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { FaInfoCircle } from "react-icons/fa";
import { toast } from "sonner";

import { updateUser } from "@/app/actions/updateUser";
import Input from "@/components/inputs/Input";
import Modal from "@/components/modals/Modal";
import { type OwnerEnableSchema, ownerEnableSchema } from "@/schemas/user";
import { SafeUser, UserRole } from "@/types/user";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: SafeUser) => void;
  initialEmail?: string;
  initialPhone?: string;
};

const OwnerEnableModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
  initialPhone = ""
}) => {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<OwnerEnableSchema>({
    resolver: zodResolver(ownerEnableSchema),
    defaultValues: {
      email: initialEmail,
      phone: initialPhone,
    },
    mode: "onBlur"
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        email: initialEmail,
        phone: initialPhone,
      });
    }
  }, [isOpen, initialEmail, initialPhone, reset]);

  const onSubmit = async (data: OwnerEnableSchema) => {
    startTransition(async () => {
      try {
        const updatedUser = await updateUser({
          phone: data.phone,
          role: UserRole.OWNER,
        });

        toast.success("Successfully registered as space owner!");
        onSuccess?.(updatedUser);
        onClose();
      } catch (error) {
        console.error("Owner Registration Error:", error);
        toast.error("Failed to register as owner. Please verify your details.");
      }
    });
  };

  const body = (
    <div className="space-y-5">
      <Input
        id="email"
        label="Email Address"
        type="email"
        placeholder="your.email@example.com"
        required
        register={register("email")}
        errors={errors}
        disabled={isPending}
      />

      <Input
        id="phone"
        label="Phone Number"
        type="number"
        placeholder="10-digit mobile number"
        required
        customLeftContent="+91"
        onNumberChange={(val) => {
          const phoneStr = val.toString().slice(0, 10);
          setValue("phone", phoneStr, { shouldValidate: true, shouldDirty: true });
        }}
        register={register("phone")}
        errors={errors}
        disabled={isPending}
      />

      <div className="bg-muted/30 border border-foreground/5 rounded-xl p-4 flex items-start gap-4">
        <FaInfoCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">What happens next?</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            We will use these contact details to start the verification process. You&apos;ll need to verify your email, phone, Aadhaar, and bank details to complete your registration as a studio host.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={onClose}
      onSubmitAction={handleSubmit(onSubmit)}
      title="Ready to List Your Studio?"
      body={body}
      actionLabel="Continue to Verification"
      customWidth="max-w-2xl"
      isLoading={isPending}
      disabled={isPending}
    />
  );
};

export default OwnerEnableModal;




