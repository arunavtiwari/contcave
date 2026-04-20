"use client"
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useCallback } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import Input from "@/components/inputs/Input";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import useUIStore from "@/hooks/useUIStore";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { type LoginSchema, loginSchema } from "@/schemas/auth";

import Modal from "./Modal";

type Props = {};

function LoginModal({ }: Props) {
  const router = useRouter();
  const uiStore = useUIStore();
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

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    setIsLoading(true);

    try {
      const callback = await signIn("credentials", {
        ...data,
        redirect: false,
      });

      if (callback?.error) {
        const friendlyMessage = getAuthErrorMessage(callback.error);
        toast.error(friendlyMessage, { id: "Login_Error_1" });
      } else if (callback?.ok) {
        toast.success("Login successful", { id: "Login_Successfully" });
        router.refresh();
        uiStore.onClose("login");
      }
    } catch {
      toast.error("Something went wrong. Please try again.", {
        id: "Login_Error_Unexpected",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    uiStore.onClose("login");
    uiStore.onOpen("register");
  }, [uiStore]);

  return (
    <Modal
      disabled={isLoading}
      isOpen={uiStore.modals.login}
      title="Login"
      actionLabel="Continue"
      onClose={() => uiStore.onClose("login")}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <div className="flex flex-col gap-4">
          <Heading title="Welcome Back" subtitle="Login to your Account!" center />

          <Input
            id="email"
            label="Email Address"
            placeholder="Enter your email"
            disabled={isLoading}
            register={register("email")}
            errors={errors}
          />


          <Input
            id="password"
            label="Password"
            placeholder="Enter your password"
            disabled={isLoading}
            register={register("password")}
            errors={errors}
            type={showPassword ? "text" : "password"}
            customRightContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            }
          />

          <div className="flex justify-end">
            <span
              onClick={() => {
                uiStore.onClose("login");
                router.push("/forgot-password");
              }}
              className="text-sm text-muted-foreground hover:underline cursor-pointer"
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
            outline
            rounded
            label="Continue with Google"
            icon={FcGoogle}
            onClick={() => signIn("google")}
          />
          <div className="text-muted-foreground text-center mt-4 font-light">
            <div>
              {"Don't have an Account? "}
              <span
                onClick={toggle}
                className="text-foreground cursor-pointer hover:underline"
              >
                Create Account
              </span>
            </div>
          </div>
        </div>
      }
      customHeight="h-auto"
    />
  );
}

export default LoginModal;

