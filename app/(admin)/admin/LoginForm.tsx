"use client";

import React, { useActionState } from "react";

import { loginAdmin } from "@/app/actions/loginAdmin";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";

export default function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAdmin, { error: "" });

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
            <div className="flex items-center justify-center p-8 bg-black text-white">
                <div className="max-w-md w-full [&_h2]:text-white! [&_p]:text-gray-400! mb-8">
                    <Heading
                        title="Contcave Admin"
                        subtitle="Secure management portal."
                        variant="h1"
                        as="h2"
                    />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full">
                    <div className="mb-6">
                        <Heading
                            title="Sign in to your account"
                            variant="h3"
                            as="h1"
                        />
                    </div>

                    {state?.error && (
                        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">
                            {state.error}
                        </div>
                    )}

                    <form action={formAction} className="flex flex-col gap-4">
                        <Input
                            id="email"
                            name="email"
                            label="Email Address"
                            type="email"
                            required
                            placeholder="admin@contcave.com"
                        />

                        <Input
                            id="password"
                            name="password"
                            label="Password"
                            type="password"
                            required
                            placeholder="••••••••"
                        />

                        <div className="pt-2">
                            <Button
                                label="Sign In"
                                loading={isPending}
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
