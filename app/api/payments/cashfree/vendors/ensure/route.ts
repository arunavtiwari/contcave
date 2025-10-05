import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { cfEnsureVendor } from "@/lib/cashfree/cashfree";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ userId: z.string() });

export async function POST(req: NextRequest) {
    const { userId } = Body.parse(await req.json());

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { paymentDetails: true },
    });
    if (!user?.paymentDetails) {
        return NextResponse.json({ message: "Payment details missing" }, { status: 400 });
    }

    if (user.paymentDetails.cashfreeVendorId) {
        return NextResponse.json({ vendorId: user.paymentDetails.cashfreeVendorId });
    }

    const vendorId = await cfEnsureVendor({
        vendor_id: `v_${userId}`,
        display_name: user.name || "Vendor",
        email: user.email || undefined,
        phone: user.phone || undefined,
        account_holder: user.paymentDetails.accountHolderName,
        account_number: user.paymentDetails.accountNumber,
        ifsc: user.paymentDetails.ifscCode,
    });

    await prisma.paymentDetails.update({
        where: { id: user.paymentDetails.id },
        data: { cashfreeVendorId: vendorId },
    });

    return NextResponse.json({ vendorId });
}
