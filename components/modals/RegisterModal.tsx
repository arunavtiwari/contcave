"use client";

import useLoginModal from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
import axios from "axios";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";
import { signIn } from "next-auth/react";
import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function RegisterModal() {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const ownerRegisterModal = useOwnerRegisterModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);

    try {
      await axios.post("/api/register", data);
      const callback = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (callback?.ok) {
        toast.success("Successfully registered and logged in!", {
          toastId: "Registered"
        });
        registerModal.onClose();
      } else if (callback?.error) {
        toast.error("Login failed", {
          toastId: "Login_Error_1"
        });
      }
    } catch (err) {
      toast.error("Something went wrong during registration.", {
        toastId: "Registration_Error_1"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    loginModal.onOpen();
    registerModal.onClose();
  }, [loginModal, registerModal]);

  const ownertoggle = useCallback(() => {
    ownerRegisterModal.onOpen();
    registerModal.onClose();
  }, [ownerRegisterModal, registerModal]);

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title="Register"
      actionLabel="Continue"
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <div className="flex flex-col gap-6">
          <Heading title="Welcome to ContCave" subtitle="Create an Account!" center />


          <Input
            id="email"
            label="Email"
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

          {/* Name Validation */}
          <Input
            id="name"
            label="User Name"
            disabled={isLoading}
            register={register("name", {
              required: "Username is required",
              minLength: {
                value: 3,
                message: "Username must be at least 3 characters",
              },
              maxLength: {
                value: 20,
                message: "Username cannot exceed 20 characters",
              },
            })}
            errors={errors}
          />

          {/* Password Validation */}
          <div className="relative">
            <Input
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              disabled={isLoading}
              register={register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
                // pattern: {
                //   value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/,
                //   message: "Password must contain letters and numbers",
                // },
              })}
              errors={errors}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-black focus:outline-none"
            >
              {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-4 mt-6">
          <hr className="border-neutral-300" />
          <Button
            rounded
            classNames="w-full py-2.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-full flex items-center justify-center"
            label="Continue with Google"
            icon={FcGoogle}
            onClick={() => signIn("google")}
          />
          <div className="text-neutral-500 text-center mt-4 font-light">
            <div>
              Already have an account?{" "}
              <span
                onClick={toggle}
                className="text-neutral-800 cursor-pointer hover:underline"
              >
                Log in
              </span>
            </div>
          </div>
          <div className="text-neutral-500 text-center mt-4 font-light">
            <div>
              Are you a space owner?{" "}
              <span
                onClick={ownertoggle}
                className="text-neutral-800 cursor-pointer hover:underline"
              >
                Register here
              </span>
            </div>
          </div>
        </div>
      }
    />
  );
}

export default RegisterModal;
