import { DefaultSession } from "next-auth";

import { UserRole } from "@/types/user";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
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
    role?: UserRole;
    phone?: string | null;
    is_verified?: boolean;
  }
}
