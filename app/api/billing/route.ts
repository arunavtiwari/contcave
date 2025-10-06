import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

/**
 * POST → Create new or update existing BillingDetails (if GSTIN already exists)
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, gstin, billingAddress, isDefault } = body;

    if (!companyName || !gstin || !billingAddress) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // ✅ Validate GSTIN format (15 alphanumeric chars)
    const gstRegex = /^[0-9A-Z]{15}$/;
    if (!gstRegex.test(gstin)) {
      return NextResponse.json({ message: "Invalid GSTIN format" }, { status: 400 });
    }

    // ✅ Unset previous default if this one is set default
    if (isDefault) {
      await prisma.billingDetails.updateMany({
        where: { userId: currentUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // ✅ Check if GSTIN already exists for this user
    const existing = await prisma.billingDetails.findFirst({
      where: { userId: currentUser.id, gstin },
    });

    let billingRecord;

    if (existing) {
      // Update existing record
      billingRecord = await prisma.billingDetails.update({
        where: { id: existing.id },
        data: {
          companyName,
          billingAddress,
          isDefault: isDefault ?? existing.isDefault,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new record
      billingRecord = await prisma.billingDetails.create({
        data: {
          userId: currentUser.id,
          companyName,
          gstin,
          billingAddress,
          isDefault: isDefault ?? false,
        },
      });
    }

    return NextResponse.json(billingRecord, { status: 200 });
  } catch (error: any) {
    console.error("Billing POST error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to save billing details" },
      { status: 500 }
    );
  }
}

/**
 * GET → Retrieve all billing records for the current user
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.billingDetails.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(records, { status: 200 });
  } catch (error: any) {
    console.error("Billing GET error:", error);
    return NextResponse.json(
      { message: "Failed to fetch billing details" },
      { status: 500 }
    );
  }
}

/**
 * PUT → Update specific billing record by ID
 */
export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, companyName, gstin, billingAddress, isDefault } = body;

    if (!id) {
      return NextResponse.json({ message: "Billing record ID is required" }, { status: 400 });
    }

    const existing = await prisma.billingDetails.findUnique({ where: { id } });
    if (!existing || existing.userId !== currentUser.id) {
      return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.billingDetails.updateMany({
        where: { userId: currentUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.billingDetails.update({
      where: { id },
      data: {
        companyName: companyName ?? existing.companyName,
        gstin: gstin ?? existing.gstin,
        billingAddress: billingAddress ?? existing.billingAddress,
        isDefault: isDefault ?? existing.isDefault,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Billing PUT error:", error);
    return NextResponse.json(
      { message: "Failed to update billing record" },
      { status: 500 }
    );
  }
}
