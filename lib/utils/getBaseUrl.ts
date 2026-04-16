export function getBaseUrl(): string {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}
