import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getClientIp } from "@/lib/http/requestMeta";
import prisma from "@/lib/prismadb";
import { rateLimit } from "@/lib/security/rateLimit";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile",
                },
            },
        }),
        Google({
            id: "google-calendar",
            name: "Google Calendar",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope:
                        "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, request) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const email = String(credentials.email).trim().toLowerCase();
                const ip = getClientIp(request.headers);
                const ipLimit = rateLimit({
                    key: `auth:credentials:ip:${ip}`,
                    limit: 20,
                    windowMs: 15 * 60 * 1000,
                });
                const identityLimit = rateLimit({
                    key: `auth:credentials:identity:${ip}:${email}`,
                    limit: 8,
                    windowMs: 15 * 60 * 1000,
                });
                if (!ipLimit.allowed || !identityLimit.allowed) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.hashedPassword) {
                    // Use the same message regardless of whether the user exists
                    // to prevent email enumeration attacks.
                    throw new Error("Invalid credentials");
                }

                const isCorrectPassword = await bcrypt.compare(
                    String(credentials?.password || ""),
                    user.hashedPassword
                );
                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }
                return user;
            },
        }),
    ],
    events: {
        async signIn(message) {
            await prisma.$transaction(async (tx) => {
                const restored = await tx.user.updateMany({
                    where: { id: message.user.id, markedForDeletion: true },
                    data: { markedForDeletion: false, markedForDeletionAt: null },
                });
                if (restored.count === 1) {
                    await tx.listing.updateMany({
                        where: { userId: message.user.id, accountDeactivatedAt: { not: null } },
                        data: { active: true, accountDeactivatedAt: null },
                    });
                }
            });
            if (message.account?.provider === "google-calendar") {
                try {
                    // Only mark the calendar as connected — never touch role here.
                    // Role promotion to OWNER must happen through the verified
                    // onboarding flow, not automatically on calendar connection.
                    await prisma.user.update({
                        where: { id: message.user.id },
                        data: { googleCalendarConnected: true },
                    });
                } catch (error) {
                    console.error("Error updating googleCalendarConnected:", error);
                }
            }
        },
    },
});
