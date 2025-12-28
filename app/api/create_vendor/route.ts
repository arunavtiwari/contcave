import axios from "axios";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Create Vendor] Request received');
    }

    const resp = await axios.post(
      "https://api.cashfree.com/pg/easy-split/vendors", // sandbox => https://sandbox.cashfree.com/pg/easy-split/vendors
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2023-08-01"
        }
      }
    );

    if (process.env.NODE_ENV === 'development') {
      console.warn('[Create Vendor] Success');
    }
    return createSuccessResponse(resp.data, resp.status);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      return createErrorResponse(err.response?.data || err.message, err.response?.status || 500);
    }
    return handleRouteError(err, "POST /api/create_vendor");
  }
}
