import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Verify OTP] Request received');
        }

        const httpsAgent = process.env.FIXIE_URL
            ? new HttpsProxyAgent(process.env.FIXIE_URL)
            : undefined;

        if (httpsAgent) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Verify OTP] Using proxy for outbound request');
            }
        }

        const resp = await axios.post(
            "https://api.cashfree.com/verification/offline-aadhaar/verify",
            {
                ref_id: body.refId,
                otp: body.otp,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-client-id": process.env.CASHFREE_CLIENT_ID!,
                    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
                },
                httpsAgent,
            }
        );

        if (process.env.NODE_ENV === 'development') {
            console.warn('[Verify OTP] Success');
        }
        return createSuccessResponse(resp.data, resp.status);
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            return createErrorResponse(err.response?.data || err.message, err.response?.status || 500);
        }
        return handleRouteError(err, "POST /api/verification");
    }
}
