// next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    calendarAccessToken?: string;
    calendarRefreshToken?: string;
    calendarAccessTokenExpires?: number;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    error?: string;
    refreshToken?: string;
    accessTokenExpires?: number | null;
  }
}
