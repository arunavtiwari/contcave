import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

export async function POST(request: NextRequest) {
  try {
    const { userId, companyName, gstin, billingAddress, isDefault } = await request.json();

    if (!userId || !companyName || !gstin || !billingAddress) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.billingDetails.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const billing = await prisma.billingDetails.create({
      data: {
        userId,
        companyName,
        gstin,
        billingAddress,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ billingDetailId: billing.id, billing }, { status: 201 });
  } catch (error) {
    console.error("Failed to create billing detail", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
