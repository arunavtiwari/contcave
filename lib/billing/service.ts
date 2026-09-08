
import { UserFacingError } from "@/lib/errors";
import prisma from "@/lib/prismadb";
import { billingSchema } from "@/schemas/billing";

function serializeBillingRecord<T extends { createdAt: Date; updatedAt: Date }>(record: T) {
    return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class BillingService {
    /**
     * Get all billing records for a user.
     */
    static async getRecords(userId: string) {
        const records = await prisma.billingDetails.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return records.map(serializeBillingRecord);
    }

    /**
     * Create or update a billing record.
     * Manages 'isDefault' atomicity.
     */
    static async upsertRecord(userId: string, data: Record<string, unknown>) {
        const validation = billingSchema.safeParse(data);
        if (!validation.success) throw new UserFacingError(validation.error.issues[0]?.message || "Invalid billing details");

        const validData = validation.data;
        const isDefault = validData.isDefault;

        const record = await prisma.$transaction(async (tx) => {
            if (isDefault) {
                await tx.billingDetails.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            return await tx.billingDetails.upsert({
                where: { userId_gstin: { userId, gstin: validData.gstin } },
                update: {
                    companyName: validData.companyName,
                    billingAddress: validData.billingAddress,
                    isDefault,
                },
                create: {
                    userId,
                    companyName: validData.companyName,
                    gstin: validData.gstin,
                    billingAddress: validData.billingAddress,
                    isDefault,
                }
            });
        });
        return serializeBillingRecord(record);
    }

    /**
     * Update an specific billing record by ID.
     */
    static async updateRecord(userId: string, recordId: string, data: Record<string, unknown>) {
        const validation = billingSchema.partial().refine(
            (value) => Object.keys(value).length > 0,
            "At least one billing field is required"
        ).safeParse(data);
        if (!validation.success) throw new UserFacingError(validation.error.issues[0]?.message || "Invalid billing details");
        const validData = validation.data;
        const existing = await prisma.billingDetails.findUnique({ where: { id: recordId } });
        if (!existing || existing.userId !== userId) throw new UserFacingError("Billing record not found", 404);

        const record = await prisma.$transaction(async (tx) => {
            if (validData.isDefault) {
                await tx.billingDetails.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            return await tx.billingDetails.update({
                where: { id: recordId },
                data: {
                    companyName: validData.companyName ?? existing.companyName,
                    gstin: validData.gstin ?? existing.gstin,
                    billingAddress: validData.billingAddress ?? existing.billingAddress,
                    isDefault: validData.isDefault ?? existing.isDefault,
                }
            });
        });
        return serializeBillingRecord(record);
    }
}
