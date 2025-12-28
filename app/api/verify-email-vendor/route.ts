import axios from "axios";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return createErrorResponse("Email is required", 400);
        }

        const response = await axios.post(
            "https://control.msg91.com/api/v5/email/validate",
            { email },
            {
                headers: {
                    accept: "application/json",
                    authkey: process.env.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        return createSuccessResponse({ result: response.data }, 200);
    } catch (error) {
        return handleRouteError(error, "POST /api/verify-email-vendor");
    }
}
