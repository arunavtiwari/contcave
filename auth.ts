import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import prisma from "@/lib/prismadb";

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
            async authorize(credentials: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.hashedPassword) {
                    if (!user) {
                        throw new Error("User not found");
                    } else {
                        throw new Error("Invalid credentials");
                    }
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.hashedPassword
                );
                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return user as any;
            },
        }),
    ],
    events: {
        async signIn(message) {
            if (message.account?.provider === "google-calendar") {
                try {
                    await prisma.user.update({
                        where: { id: message.user.id },
                        data: {

                            role: "OWNER" as UserRole,
                            googleCalendarConnected: true,
                        },
                    });
                } catch (error) {
                    console.error("Error updating fields in signIn event:", error);
                }
            }
        },
    },
});
