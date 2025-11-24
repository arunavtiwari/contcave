import prisma from "@/lib/prismadb";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

async function refreshCalendarAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.calendarRefreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      calendarAccessToken: refreshedTokens.access_token,
      calendarAccessTokenExpires:
        Date.now() + refreshedTokens.expires_in * 1000,
      calendarRefreshToken:
        refreshedTokens.refresh_token ?? token.calendarRefreshToken,
    };
  } catch (error) {
    console.error("Error refreshing calendar access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Basic Google
    GoogleProvider({
      id: "google",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
    // Google Calendar
    GoogleProvider({
      id: "google-calendar",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    // Credentials provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          if (!user) {
            throw new Error("User not found");
          } else {
            throw new Error("Invalid credentials");
          }
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }
        return user;
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        if (account.provider === "google-calendar") {
          token.calendarAccessToken = account.access_token;
          token.calendarRefreshToken = account.refresh_token;
          token.calendarAccessTokenExpires =
            Date.now() + Number(account.expires_in) * 1000;
        } else if (account.provider === "google") {
          token.accessToken = account.access_token;
        }
        return token;
      }

      if (
        token.calendarAccessToken &&
        token.calendarAccessTokenExpires &&
        Date.now() < Number(token.calendarAccessTokenExpires)
      ) {
        return token;
      }

      if (token.calendarRefreshToken) {
        return await refreshCalendarAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.calendarAccessToken = token.calendarAccessToken as
        | string
        | undefined;
      session.calendarRefreshToken = token.calendarRefreshToken as
        | string
        | undefined;
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message.account?.provider === "google-calendar") {
        try {
          await prisma.user.update({
            where: { id: message.user.id },
            data: {
              is_owner: true,
              googleCalendarConnected: true,
            },
          });
        } catch (error) {
          console.error("Error updating fields in signIn event:", error);
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
