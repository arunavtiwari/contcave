// /pages/api/invoice.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prismadb";
import { generateInvoicePDFBlob } from "@/lib/invoice/pdfBlob"; 
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, reservationId, transactionId, amount } = req.body;

    // Fetch user with default billing details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        billingDetails: { where: { isDefault: true }, take: 1 },
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    const billing = user.billingDetails?.[0] ?? null;

    // Calculate GST
    const gstRate = 0.18;
    const gstAmount = amount * gstRate;
    const totalAmount = amount + gstAmount;

    const invoiceNumber = `CC-${Date.now()}`;

    // Generate PDF blob
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

    const signRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cloudinary/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paramsToSign: { folder, timestamp, public_id: publicId } }),
    });
    const sign = await signRes.json();
    if (!sign?.signature) throw new Error("Cloudinary signature failed");

    const fd = new FormData();
    fd.append("file", pdfBlob, `${publicId}.pdf`);
    fd.append("folder", folder);
    fd.append("timestamp", String(sign.timestamp));
    fd.append("public_id", publicId);
    fd.append("api_key", sign.apiKey);
    fd.append("signature", sign.signature);

    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud}/image/upload`, {
      method: "POST",
      body: fd,
    });
    const up = await upRes.json();
    if (!upRes.ok) throw new Error(up?.error?.message || "Cloudinary upload failed");

    // Save invoice in Prisma
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
        invoiceUrl: up.secure_url,
      },
    });

    return res.status(200).json({
      invoiceUrl: up.secure_url,
      invoiceId: invoiceRecord.id,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Failed to generate invoice" });
  }
}
