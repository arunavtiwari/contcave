"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { registerUserAction } from "@/app/actions/authActions";
import Input from "@/components/inputs/Input";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Divider from "@/components/ui/Divider";
import Heading from "@/components/ui/Heading";
import useUIStore from "@/hooks/useUIStore";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { RegisterSchema, registerSchema } from "@/schemas/auth";

function RegisterModal() {
  const router = useRouter();
  const uiStore = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<RegisterSchema> = async (data) => {
    setIsLoading(true);

    try {
      const response = await registerUserAction(data);

      if (!response.success) {
        toast.error(response.error || "Registration failed", {
          id: "Registration_Error_Action"
        });
        return;
      }

      const callback = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (callback?.error) {
        toast.error(getAuthErrorMessage(callback.error), {
          id: "Login_Error_1"
        });
      } else if (callback?.ok) {
        toast.success("Successfully registered and logged in!", {
          id: "Registered"
        });
        router.refresh();
        uiStore.onClose("register");
      }
    } catch (_err: unknown) {
      toast.error("Something went wrong during registration.", {
        id: "Registration_Error_Unknown"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    uiStore.onOpen("login");
    uiStore.onClose("register");
  }, [uiStore]);

  const ownertoggle = useCallback(() => {
    uiStore.onOpen("ownerRegister");
    uiStore.onClose("register");
  }, [uiStore]);

  return (
    <Modal
      disabled={isLoading}
      isOpen={uiStore.modals.register}
      title="Register"
      actionLabel="Continue"
      onCloseAction={() => uiStore.onClose("register")}
      onSubmitAction={handleSubmit(onSubmit)}
      body={
        <div className="flex flex-col gap-6">
          <Heading title="Welcome to ContCave" subtitle="Create an Account!" center />


          <Input
            id="email"
            label="Email"
            placeholder="Enter your email"
            disabled={isLoading}
            register={formRegister("email")}
            errors={errors}
          />


          <Input
            id="name"
            label="User Name"
            placeholder="Enter your name"
            disabled={isLoading}
            register={formRegister("name")}
            errors={errors}
          />


          <Input
            id="password"
            label="Password"
            placeholder="Create a password"
            type={showPassword ? "text" : "password"}
            disabled={isLoading}
            register={formRegister("password")}
            errors={errors}
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
        </div>
      }
      footer={
        <div className="flex flex-col gap-4 mt-6">
          <Divider />
          <Button
            outline
            rounded
            label="Continue with Google"
            icon={FcGoogle}
            onClick={() => signIn("google")}
          />
          <div className="text-muted-foreground text-center mt-4 font-light">
            <div>
              Already have an account{" "}
              <span
                onClick={toggle}
                className="text-foreground cursor-pointer hover:underline"
              >
                Log in
              </span>
            </div>
          </div>
          <div className="text-muted-foreground text-center mt-4 font-light">
            <div>
              Are you a space owner{" "}
              <span
                onClick={ownertoggle}
                className="text-foreground cursor-pointer hover:underline"
              >
                Register here
              </span>
            </div>
          </div>
        </div>
      }
      customHeight="h-auto"
    />
  );
}

export default RegisterModal;


