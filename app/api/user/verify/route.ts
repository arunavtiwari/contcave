// app/api/user/verify/route.ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const {
    step,
    aadhaarRefId,
    bankVerifiedName,
  } = body;

  try {
    const updates: any = {};

    if (step === "phone") {
      updates.phone_verified = true;
      updates.verified_via = { push: "phone_otp" };
    }

    if (step === "aadhaar") {
      updates.aadhaar_verified = true;
      updates.aadhaar_ref_id = aadhaarRefId;
      updates.verified_via = { push: "aadhaar_okyc" };
    }

    if (step === "bank") {
      updates.bank_verified = true;
      if (bankVerifiedName) updates.bank_verified_name = bankVerifiedName;
      updates.verified_via = { push: "bank_verification" };
    }

    // bump stage
    updates.verification_stage = { increment: 1 };

    // mark overall verified if all checks passed
    if (currentUser.phone_verified && currentUser.aadhaar_verified && currentUser.bank_verified) {
      updates.is_verified = true;
      updates.verified_at = new Date();
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: updates,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("Failed to update verification:", err);
    return NextResponse.json({ message: "Failed to update verification" }, { status: 500 });
  }
}
