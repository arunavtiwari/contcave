/**
 * Maps NextAuth v5 error codes to user-friendly messages.
 *
 * NextAuth does NOT forward custom error messages from the `authorize()`
 * callback to the client (for security). Instead it returns generic codes
 * such as "Configuration", "CredentialsSignin", etc.
 *
 * @see https://authjs.dev/reference/core/errors
 */

const AUTH_ERROR_MAP: Record<string, string> = {
    // Credentials-related
    CredentialsSignin: "Invalid email or password. Please try again.",
    Configuration: "Invalid email or password. Please try again.",

    // OAuth / Account linking
    OAuthSignin: "Could not start sign-in. Please try again.",
    OAuthCallback: "Sign-in was interrupted. Please try again.",
    OAuthCreateAccount: "Could not create your account. Please try again.",
    OAuthAccountNotLinked:
        "This email is already associated with another sign-in method. Please use your original sign-in method.",

    // Session / Token
    SessionRequired: "Your session has expired. Please sign in again.",

    // General
    AccessDenied: "Access denied. You do not have permission.",
    Verification: "The verification link has expired or has already been used.",
    Default: "Something went wrong. Please try again.",
};

export function getAuthErrorMessage(errorCode: string): string {
    return AUTH_ERROR_MAP[errorCode] ?? AUTH_ERROR_MAP.Default!;
}
