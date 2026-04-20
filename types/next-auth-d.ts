import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_owner?: boolean;
      phone?: string | null;
      is_verified?: boolean;
    } & DefaultSession["user"];
    accessToken?: string;
    calendarAccessToken?: string;
    calendarRefreshToken?: string;
    calendarAccessTokenExpires?: number;
    error?: string;
  }

  interface User {
    id: string;
    is_owner?: boolean;
    phone?: string | null;
    is_verified?: boolean;
  }
}
