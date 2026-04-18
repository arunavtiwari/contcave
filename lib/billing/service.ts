
import prisma from "@/lib/prismadb";
import { billingSchema } from "@/schemas/billing";

export class BillingService {
    /**
     * Get all billing records for a user.
     */
    static async getRecords(userId: string) {
        return await prisma.billingDetails.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Create or update a billing record.
     * Manages 'isDefault' atomicity.
     */
    static async upsertRecord(userId: string, data: Record<string, unknown>) {
        const validation = billingSchema.safeParse(data);
        if (!validation.success) throw new Error(validation.error.issues[0].message);

        const validData = validation.data;
        const isDefault = Boolean(data.isDefault);

        return await prisma.$transaction(async (tx) => {
            if (isDefault) {
                await tx.billingDetails.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            const existing = await tx.billingDetails.findFirst({
                where: { userId, gstin: validData.gstin },
                select: { id: true }
            });

            if (existing) {
                return await tx.billingDetails.update({
                    where: { id: existing.id },
                    data: {
                        companyName: validData.companyName,
                        billingAddress: validData.billingAddress,
                        isDefault,
                        updatedAt: new Date(),
                    }
                });
            }

            return await tx.billingDetails.create({
                data: {
                    userId,
                    companyName: validData.companyName,
                    gstin: validData.gstin,
                    billingAddress: validData.billingAddress,
                    isDefault,
                }
            });
        });
    }

    /**
     * Update an specific billing record by ID.
     */
    static async updateRecord(userId: string, recordId: string, data: Record<string, unknown>) {
        const existing = await prisma.billingDetails.findUnique({ where: { id: recordId } });
        if (!existing || existing.userId !== userId) throw new Error("Billing record not found or unauthorized");

        return await prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                await tx.billingDetails.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            return await tx.billingDetails.update({
                where: { id: recordId },
                data: {
                    companyName: (data.companyName as string) ?? existing.companyName,
                    gstin: (data.gstin as string) ?? existing.gstin,
                    billingAddress: (data.billingAddress as string) ?? existing.billingAddress,
                    isDefault: (data.isDefault as boolean) ?? existing.isDefault,
                }
            });
        });
    }
}
