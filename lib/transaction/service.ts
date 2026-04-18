import { Prisma, TransactionStatus } from "@prisma/client";

import prisma from "@/lib/prismadb";

export class TransactionService {
    /**
     * Update a transaction's status and link it to the external payment ID.
     */
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

    /**
     * Professionalized creation with input typing.
     */
    static async create(data: Prisma.TransactionUncheckedCreateInput) {
        return await prisma.transaction.create({
            data
        });
    }

    /**
     * Data Retrieval: Find by ID.
     */
    static async findById(id: string) {
        return await prisma.transaction.findUnique({ where: { id } });
    }

    /**
     * Session management for payment flows.
     */
    static async updateSession(id: string, sessionId: string, orderId: string) {
        return await prisma.transaction.update({
            where: { id },
            data: { cfPaymentSessionId: sessionId, cfOrderId: orderId }
        });
    }

    /**
     * Mark transaction as failed with a sanitized reason.
     */
    static async fail(id: string, reason: string) {
        return await prisma.transaction.update({
            where: { id },
            data: { status: "FAILED", description: reason.trim().slice(0, 500) }
        });
    }

    /**
     * Find by reference code for reconciliation.
     */
    static async findByRef(ref: string) {
        return await prisma.transaction.findFirst({
            where: { cfTxnRef: ref, status: "PENDING" }
        });
    }

    /**
     * Find by Cashfree Order ID.
     */
    static async findByOrderId(orderId: string) {
        return await prisma.transaction.findFirst({
            where: { cfOrderId: orderId },
            orderBy: { createdAt: "desc" },
        });
    }
}
