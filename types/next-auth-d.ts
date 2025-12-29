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