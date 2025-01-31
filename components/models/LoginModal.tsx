"use client"
import { useState } from "react";
import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { AiFillFacebook } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";

import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";

type Props = {};

function LoginModal({ }: Props) {
  const router = useRouter();
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    signIn("credentials", {
      ...data,
      redirect: false,
    }).then((callback) => {
      setIsLoading(false);

      if (callback?.ok) {
        toast.success("Login Successfully");
        router.refresh();
        loginModel.onClose();
      } else if (callback?.error) {
        toast.error("Something Went Wrong");
      }
    });
  };

  const toggle = useCallback(() => {
    loginModel.onClose();
    registerModel.onOpen();
  }, [loginModel, registerModel]);

  return (
    <Modal
      disabled={isLoading}
      isOpen={loginModel.isOpen}
      title="Login"
      actionLabel="Continue"
      onClose={loginModel.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <div className="flex flex-col gap-4">
          <Heading title="Welcome Back" subtitle="Login to your Account!" center />

          <Input
            id="email"
            label="Email Address"
            disabled={isLoading}
            register={register("email", {
              required: "Email is required",
              pattern: {
                value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                message: "Enter a valid email address",
              },
            })}
            errors={errors}
          />

          <Input
            id="password"
            label="Password"
            disabled={isLoading}
            register={register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            errors={errors}
            type={showPassword ? "text" : "password"}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-sm text-neutral-600 focus:outline-none"
          >
            {showPassword ? "Hide" : "Show"} Password
          </button>
        </div>
      }
      footer={
        <div className="flex flex-col gap-4 mt-3">
          <hr />
          <Button
            outline
            classNames="w-full py-3 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-full flex items-center justify-center space-x-3"
            label="Continue with Google"
            icon={FcGoogle}
            onClick={() => signIn("google")}
          />
          <div className="text-neutral-500 text-center mt-4 font-light">
            <div>
              {"Don't have an Account? "}
              <span
                onClick={toggle}
                className="text-neutral-800 cursor-pointer hover:underline"
              >
                Create Account
              </span>
            </div>
          </div>
        </div>
      }
    />
  );
}

export default LoginModal;
