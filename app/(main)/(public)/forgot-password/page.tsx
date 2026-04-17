"use client";

import axios from "axios";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";

const ForgotPasswordPage = () => {
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            email: "",
        },
    });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios
            .post("/api/auth/request-reset", data)
            .then(() => {
                toast.success("If an account exists, a reset email has been sent.");
            })
            .catch(() => {
                toast.error("Something went wrong.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="mb-6">
                        <Heading
                            title="Forgot Password"
                            subtitle="Enter your email to reset your password"
                            center
                        />
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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

                        <Button
                            disabled={isLoading}
                            label="Send Reset Link"
                            onClick={handleSubmit(onSubmit)}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
