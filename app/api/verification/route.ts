import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Verify OTP] Incoming request body:", body);

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
      }
    );

    console.log("[Verify OTP] Cashfree response:", resp.data);
    return NextResponse.json(resp.data, { status: resp.status });
  } catch (err: any) {
    console.error("[Verify OTP] Error:", err.response?.data || err.message);
    return NextResponse.json(
      { error: err.response?.data || err.message },
      { status: err.response?.status || 500 }
    );
  }
}
