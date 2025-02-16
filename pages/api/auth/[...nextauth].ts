import prisma from "@/lib/prismadb";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

interface ExtendedToken {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number | null;
  error?: string;
  [key: string]: any;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
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

        // Normalize email to avoid case sensitivity issues
        const normalizedEmail = credentials.email.toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
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
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      const extendedToken = token as ExtendedToken;

      // On initial sign in, persist the OAuth tokens and expiry
      if (account && user) {
        if (account.type === "oauth") {
          extendedToken.accessToken = account.access_token;
          extendedToken.refreshToken = account.refresh_token;
          extendedToken.accessTokenExpires = account.expires_at
            ? account.expires_at * 1000
            : null;
        }
        return extendedToken;
      }

      // Return the token if the access token has not expired
      if (
        typeof extendedToken.accessTokenExpires === "number" &&
        Date.now() < extendedToken.accessTokenExpires
      ) {
        return extendedToken;
      }

      // Access token has expired, try to refresh it if a refresh token exists
      if (extendedToken.refreshToken) {
        return await refreshAccessToken(extendedToken);
      }

      // If no refresh token is available, return the token as-is.
      return extendedToken;
    },
    async session({ session, token }) {
      session.accessToken = (token as ExtendedToken).accessToken;
      // Optionally include any token errors in the session
      session.error = (token as ExtendedToken).error;
      return session;
    },
  },
};

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken!,
    });

    const response = await fetch(
      `https://oauth2.googleapis.com/token?${params.toString()}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      }
    );

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth(authOptions);