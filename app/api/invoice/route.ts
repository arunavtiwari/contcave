import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { generateInvoicePDFBlob } from "@/lib/invoice/pdfBlob";

export async function POST(req: Request) {
  try {
    const { userId, reservationId, transactionId, amount } = await req.json();

    if (!userId || !reservationId || !transactionId || !amount) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch user with default billing details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        billingDetails: { where: { isDefault: true }, take: 1 },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const billing = user.billingDetails?.[0] ?? null;

    // Calculate GST
    const gstRate = 0.18;
    const gstAmount = amount * gstRate;
    const totalAmount = amount + gstAmount;
    const invoiceNumber = `CC-${Date.now()}`;

    // Generate PDF Blob
    const pdfBlob = await generateInvoicePDFBlob({
      invoiceNumber,
      user,
      billing,
      amount,
      gstAmount,
      totalAmount,
      reservationId,
    });

    // Upload to Cloudinary
    const folder = "invoices";
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `reservation_${reservationId}_${timestamp}`;

    const signRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/cloudinary/sign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paramsToSign: { folder, timestamp, public_id: publicId },
        }),
      }
    );

    const sign = await signRes.json();
    if (!sign?.signature)
      throw new Error("Cloudinary signature generation failed");

    const formData = new FormData();
    formData.append("file", pdfBlob, `${publicId}.pdf`);
    formData.append("folder", folder);
    formData.append("timestamp", String(sign.timestamp));
    formData.append("public_id", publicId);
    formData.append("api_key", sign.apiKey);
    formData.append("signature", sign.signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${sign.cloud}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok)
      throw new Error(uploadData?.error?.message || "Cloudinary upload failed");

    // Save in Prisma
    const invoiceRecord = await prisma.invoice.create({
      data: {
        userId,
        reservationId,
        transactionId,
        billingId: billing?.id,
        amount,
        gstAmount,
        totalAmount,
        invoiceNumber,
        invoiceUrl: uploadData.secure_url,
      },
    });

    return NextResponse.json({
      invoiceUrl: uploadData.secure_url,
      invoiceId: invoiceRecord.id,
    });
  } catch (error: any) {
    console.error("Invoice generation failed:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
