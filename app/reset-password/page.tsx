"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/inputs/Input";
import Heading from "@/components/Heading";
import Button from "@/components/Button";
import useLoginModal from "@/hook/useLoginModal";

const ResetPasswordContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get("token");
    const [isLoading, setIsLoading] = useState(false);
    const loginModal = useLoginModal();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (!token) {
            toast.error("Invalid or missing token");
            router.push("/");
        }
    }, [token, router]);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (data.password !== data.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        axios
            .post("/api/auth/reset-password", {
                token,
                password: data.password,
            })
            .then(() => {
                toast.success("Password reset successfully");
                loginModal.onOpen();
                router.push("/");
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error || "Something went wrong");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    if (!token) return null;

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="mb-6">
                        <Heading
                            title="Reset Password"
                            subtitle="Enter your new password"
                            center
                        />
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            id="password"
                            label="New Password"
                            type="password"
                            disabled={isLoading}
                            register={register("password", {
                                required: "Password is required",
                                minLength: {
                                    value: 6,
                                    message: "Password must be at least 6 characters",
                                },
                            })}
                            errors={errors}
                        />
                        <Input
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            disabled={isLoading}
                            register={register("confirmPassword", {
                                required: "Please confirm your password",
                            })}
                            errors={errors}
                        />

                        <Button
                            disabled={isLoading}
                            label="Reset Password"
                            onClick={handleSubmit(onSubmit)}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

const ResetPasswordPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
};

export default ResetPasswordPage;
