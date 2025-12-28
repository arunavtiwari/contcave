// next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    calendarAccessToken?: string;
    calendarRefreshToken?: string;
    calendarAccessTokenExpires?: number;
    error?: string;
  }
}


// Note: JWT module augmentation removed for NextAuth v5 compatibility
// If JWT customization is needed, use the auth.ts configuration instead
/*
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    error?: string;
    refreshToken?: string;
    accessTokenExpires?: number | null;
  }
}
*/
