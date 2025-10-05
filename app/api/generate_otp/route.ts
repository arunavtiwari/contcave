import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Generate OTP] Incoming request body:", body);

    const resp = await axios.post(
      "https://api.cashfree.com/verification/offline-aadhaar/otp",
      { aadhaar_number: body.aadhaarNumber },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_CLIENT_ID!,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
        },
      }
    );

    console.log("[Generate OTP] Cashfree response:", resp.data);
    return NextResponse.json(resp.data, { status: resp.status });
  } catch (err: any) {
    console.error("[Generate OTP] Error:", err.response?.data || err.message);
    return NextResponse.json(
      { error: err.response?.data || err.message },
      { status: err.response?.status || 500 }
    );
  }
}
