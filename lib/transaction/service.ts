import { Prisma, TransactionStatus } from "@prisma/client";

import prisma from "@/lib/prismadb";

export class TransactionService {
    static async updateStatus(params: {
        txnId: string;
        status: TransactionStatus;
        cfPaymentId?: string;
        webhookPayload?: Record<string, unknown>;
        signature?: string;
    }) {
        const { txnId, status, cfPaymentId, webhookPayload, signature } = params;

        return await prisma.transaction.update({
            where: { id: txnId },
            data: {
                status,
                cfPaymentId,
                cfWebhookPayload: webhookPayload as Prisma.InputJsonValue,
                cfSignature: signature || undefined,
            }
        });
    }

    static async updateWebhookMetadata(params: {
        txnId: string;
        cfPaymentId?: string;
        webhookPayload?: Record<string, unknown>;
        signature?: string;
    }) {
        const { txnId, cfPaymentId, webhookPayload, signature } = params;

        return await prisma.transaction.update({
            where: { id: txnId },
            data: {
                cfPaymentId,
                cfWebhookPayload: webhookPayload as Prisma.InputJsonValue,
                cfSignature: signature || undefined,
            }
        });
    }

    static async create(data: Prisma.TransactionUncheckedCreateInput) {
        return await prisma.transaction.create({
            data
        });
    }

    static async findById(id: string) {
        return await prisma.transaction.findUnique({ where: { id } });
    }

    static async updateSession(id: string, sessionId: string, orderId: string) {
        return await prisma.transaction.update({
            where: { id },
            data: { cfPaymentSessionId: sessionId, cfOrderId: orderId }
        });
    }

    static async fail(id: string, reason: string) {
        return await prisma.transaction.update({
            where: { id },
            data: { status: "FAILED", description: reason.trim().slice(0, 500) }
        });
    }

    static async findByRef(ref: string) {
        return await prisma.transaction.findFirst({
            where: { cfTxnRef: ref, status: "PENDING" }
        });
    }

    static async hasAnyRef(ref: string) {
        const txn = await prisma.transaction.findFirst({
            where: { cfTxnRef: ref },
            select: { id: true },
        });
        return Boolean(txn);
    }

    static async findByOrderId(orderId: string) {
        return await prisma.transaction.findFirst({
            where: { cfOrderId: orderId },
            orderBy: { createdAt: "desc" },
        });
    }
}
