"use client";

import React, { useActionState } from "react";

import { loginAdmin } from "@/app/actions/loginAdmin";
import Input from "@/components/inputs/Input";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export default function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAdmin, { error: "" });

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
            <div className="flex items-center justify-center p-8 bg-foreground text-background">
                <div className="max-w-md w-full [&_h2]:text-background! [&_p]:text-gray-400! mb-8">
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
                        <div className="p-4 mb-6 text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-xl font-medium">
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

