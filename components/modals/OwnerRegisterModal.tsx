"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
import { type OwnerRegisterSchema,ownerRegisterSchema } from "@/lib/schemas/auth";

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

            if (callback?.ok) {
                toast.success("Owner registered and logged in successfully!", {
                    toastId: "Owner_Registered"
                });
                router.refresh();
                ownerRegisterModal.onClose();
            } else if (callback?.error) {
                toast.error("Login failed", {
                    toastId: "Owner_Login_Error"
                });
            }
        } catch (err: unknown) {
            let errorMsg = "Something went wrong during registration.";
            if (axios.isAxiosError(err)) {
                errorMsg = err.response?.data?.error || err.response?.data || errorMsg;
            }
            toast.error(errorMsg, {
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

                    
                    <Input
                        id="email"
                        label="Email Address"
                        disabled={isLoading}
                        register={register("email")}
                        errors={errors}
                    />

                    
                    <Input
                        id="name"
                        label="Full Name"
                        disabled={isLoading}
                        register={register("name")}
                        errors={errors}
                    />

                    
                    <Input
                        id="phone"
                        label="Phone Number"
                        type="tel"
                        disabled={isLoading}
                        register={register("phone")}
                        errors={errors}
                    />

                    
                    <Input
                        id="password"
                        label="Password"
                        disabled={isLoading}
                        register={register("password")}
                        type={showPassword ? "text" : "password"}
                        errors={errors}
                    />

                    
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
