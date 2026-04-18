"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { type OwnerRegisterSchema, ownerRegisterSchema } from "@/schemas/auth";

import Modal from "./Modal";

function OwnerRegisterModal() {
    const ownerRegisterModal = useOwnerRegisterModal();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<OwnerRegisterSchema>({
        resolver: zodResolver(ownerRegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: "",
        },
    });

    const onSubmit: SubmitHandler<OwnerRegisterSchema> = async (data) => {
        setIsLoading(true);

        try {
            await axios.post("/api/register", { ...data, is_owner: true });

            const callback = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (callback?.error) {
                toast.error(getAuthErrorMessage(callback.error), {
                    id: "Owner_Login_Error"
                });
            } else if (callback?.ok) {
                toast.success("Owner registered and logged in successfully!", {
                    id: "Owner_Registered"
                });
                router.refresh();
                ownerRegisterModal.onClose();
            }
        } catch (err: unknown) {
            let errorMsg = "Something went wrong during registration.";
            if (axios.isAxiosError(err)) {
                errorMsg = err.response?.data?.error || err.response?.data || errorMsg;
            }
            toast.error(errorMsg, {
                id: "Owner_Error_1"
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


                    <Input
                        id="email"
                        label="Email Address"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        register={register("email")}
                        errors={errors}
                    />


                    <Input
                        id="name"
                        label="Full Name"
                        placeholder="Enter your full name"
                        disabled={isLoading}
                        register={register("name")}
                        errors={errors}
                    />


                    <Input
                        id="phone"
                        label="Phone Number"
                        placeholder="Enter your phone number"
                        type="tel"
                        disabled={isLoading}
                        register={register("phone")}
                        errors={errors}
                    />


                    <Input
                        id="password"
                        label="Password"
                        placeholder="Create a password"
                        disabled={isLoading}
                        register={register("password")}
                        type={showPassword ? "text" : "password"}
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
                <div className="flex flex-col gap-4 mt-3">
                    <Button
                        outline
                        rounded
                        label="Continue with Google"
                        icon={FcGoogle}
                        onClick={() => signIn("google-calendar")}
                    />
                    <div className="text-muted-foreground text-center mt-4 font-light">
                        Already have an account?{" "}
                        <span
                            onClick={() => ownerRegisterModal.onClose()}
                            className="text-foreground cursor-pointer hover:underline"
                        >
                            Log in
                        </span>
                    </div>
                </div>
            }
            customHeight="h-auto"
        />
    );
}

export default OwnerRegisterModal;
