import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, companyName, gstin, billingAddress, isDefault } = req.body;

    if (!userId || !companyName || !gstin || !billingAddress) {
      return res.status(400).json({ message: "Missing required fields" });
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
        isDefault: !!isDefault,
      },
    });

    return res.status(201).json({ billingDetailId: billing.id, billing });
  } catch (error: any) {
    console.error("Failed to create billing detail:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
