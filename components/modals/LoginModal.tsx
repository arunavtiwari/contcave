"use client"
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useCallback } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import { type LoginSchema,loginSchema } from "@/lib/schemas/auth";

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
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginSchema> = (data) => {
    setIsLoading(true);

    signIn("credentials", {
      ...data,
      redirect: false,
    }).then((callback) => {
      setIsLoading(false);

      if (callback?.ok) {
        toast.success("Login Successfully", {
          toastId: "Login_Successfully"
        });
        router.refresh();
        loginModel.onClose();
      } else if (callback?.error) {
        toast.error(callback.error, {
          toastId: "Login_Error_1"
        });
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
            register={register("email")}
            errors={errors}
          />

          <Input
            id="password"
            label="Password"
            disabled={isLoading}
            register={register("password")}
            errors={errors}
            type={showPassword ? "text" : "password"}
          />

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-neutral-600 focus:outline-none"
            >
              {showPassword ? "Hide" : "Show"} Password
            </button>
            <span
              onClick={() => {
                loginModel.onClose();
                router.push("/forgot-password");
              }}
              className="text-sm text-neutral-600 hover:underline cursor-pointer"
            >
              Forgot Password?
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-4 mt-3">
          <hr />
          <Button
            rounded
            classNames="w-full py-2.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-full flex items-center justify-center"
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
