// app/api/create_vendor/route.ts
import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("[Create Vendor] Incoming:", body);

  try {
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

    console.log("[Create Vendor] Cashfree response:", resp.data);
    return NextResponse.json(resp.data, { status: resp.status });
  } catch (err: any) {
    console.error("[Create Vendor] Error:", err.response?.data || err.message);
    return NextResponse.json(
      { error: err.response?.data || err.message },
      { status: err.response?.status || 500 }
    );
  }
}
