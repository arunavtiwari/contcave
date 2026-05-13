"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { isAdmin } from "@/lib/user/permissions";

export async function loginAdmin(prevState: unknown, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        const prisma = (await import("@/lib/prismadb")).default;
        const dbUser = await prisma.user.findUnique({ where: { email } });

        if (!isAdmin(dbUser?.role)) {
            return { error: "Unauthorized: Account lacks administrative privileges." };
        }

    } catch (error) {
        if (error instanceof AuthError) {
            const causeMessage =
                error.cause && typeof error.cause === "object" && "err" in error.cause
                    ? (error.cause as { err?: Error }).err?.message
                    : undefined;

            if (
                error.type === "CredentialsSignin" ||
                error.type === "CallbackRouteError"
            ) {
                return { error: causeMessage || "Invalid email or password." };
            }

            return { error: causeMessage || "Authentication failed. Please try again." };
        }
        throw error;
    }

    redirect("/admin/dashboard/listings");
}
