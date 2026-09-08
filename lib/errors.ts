export class UserFacingError extends Error {
    readonly status: number;

    constructor(message: string, status: number = 400) {
        super(message);
        this.name = "UserFacingError";
        this.status = status;
    }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    CredentialsSignin: "Invalid email or password. Please try again.",
    Configuration: "Invalid email or password. Please try again.",
    OAuthSignin: "Could not start sign-in. Please try again.",
    OAuthCallback: "Sign-in was interrupted. Please try again.",
    OAuthCreateAccount: "Could not create your account. Please try again.",
    OAuthAccountNotLinked: "This email is already associated with another sign-in method. Please use your original sign-in method.",
    SessionRequired: "Your session has expired. Please sign in again.",
    AccessDenied: "Access denied. You do not have permission.",
    Verification: "The verification link has expired or has already been used.",
    Default: "Something went wrong. Please try again.",
};

export function getAuthErrorMessage(errorCode: string): string {
    return AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;
}
