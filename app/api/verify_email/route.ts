import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const resp = await fetch("https://control.msg91.com/api/v5/email/validate", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY as string,
      },
      body: JSON.stringify({ email }),
    });

    const data = await resp.json();

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("Email verification error:", err);
    return NextResponse.json(
      { error: "Email verification failed" },
      { status: 500 }
    );
  }
}
