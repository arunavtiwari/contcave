"use client";

import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
import axios from "axios";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

function OwnerRegisterModal() {
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
            phone: "",
            password: "",
        },
    });

    const onSubmit: SubmitHandler<FieldValues> = async (data) => {
        setIsLoading(true);

        try {
            await axios.post("/api/register", { ...data, is_owner: true });
            toast.success("Owner registered successfully!", {
                toastId: "Owner_Registered"
            });
            ownerRegisterModal.onClose();
        } catch (error) {
            toast.error("Something went wrong during registration.", {
                toastId: "Owner_Error_1"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            disabled={isLoading}
            isOpen={ownerRegisterModal.isOpen}
            title="Register as Owner"
            actionLabel="Register"
            onClose={ownerRegisterModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={
                <div className="flex flex-col gap-6">
                    <Heading title="Welcome to ContCave" subtitle="Create an Owner Account!" center />

                    {/* Email Validation */}
                    <Input
                        id="email"
                        label="Email Address"
                        disabled={isLoading}
                        register={register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                                message: "Please enter a valid email",
                            },
                        })}
                        errors={errors}
                    />

                    {/* Name Validation */}
                    <Input
                        id="name"
                        label="Full Name"
                        disabled={isLoading}
                        register={register("name", {
                            required: "Full name is required",
                            minLength: {
                                value: 2,
                                message: "Name must be at least 2 characters long",
                            },
                            maxLength: {
                                value: 50,
                                message: "Name must be less than 50 characters",
                            },
                        })}
                        errors={errors}
                    />

                    {/* Phone Validation */}
                    <Input
                        id="phone"
                        label="Phone Number"
                        type="tel"
                        disabled={isLoading}
                        register={register("phone", {
                            required: "Phone number is required",
                            pattern: {
                                value: /^[0-9]{10}$/,
                                message: "Phone number must be exactly 10 digits",
                            },
                        })}
                        errors={errors}
                    />

                    {/* Password Validation */}
                    <Input
                        id="password"
                        label="Password"
                        disabled={isLoading}
                        register={register("password", {
                            required: "Password is required",
                            minLength: {
                                value: 8,
                                message: "Password must be at least 8 characters long",
                            },
                            // pattern: {
                            //   value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/,
                            //   message: "Password must contain letters and numbers",
                            // },
                        })}
                        type={showPassword ? "text" : "password"}
                        errors={errors}
                    />

                    {/* Toggle Password Visibility */}
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-sm text-neutral-600 focus:outline-none mt-2"
                    >
                        {showPassword ? "Hide" : "Show"} Password
                    </button>
                </div>
            }
            footer={
                <div className="flex flex-col gap-4 mt-3">
                    <Button
                        rounded
                        classNames="w-full py-2.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-full flex items-center justify-center"
                        label="Continue with Google"
                        icon={FcGoogle}
                        onClick={() => signIn("google-calendar")}
                    />
                    <div className="text-neutral-500 text-center mt-4 font-light">
                        Already have an account?{" "}
                        <span
                            onClick={() => ownerRegisterModal.onClose()}
                            className="text-neutral-800 cursor-pointer hover:underline"
                        >
                            Log in
                        </span>
                    </div>
                </div>
            }
        />
    );
}

export default OwnerRegisterModal;
