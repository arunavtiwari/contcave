import "server-only";

import { Prisma, TransactionStatus } from '@prisma/client';

import prisma from "@/lib/prismadb";

export function mapTransactionStatus(
    status: TransactionStatus
): 'Pending' | 'Successful' | 'Failed' | 'Refunded' {
    switch (status) {
        case 'PENDING':
            return 'Pending';
        case 'SUCCESS':
            return 'Successful';
        case 'FAILED':
        case 'CANCELLED':
        case 'EXPIRED':
            return 'Failed';
        case 'REFUNDED':
            return 'Refunded';
        default:
            return 'Pending';
    }
}

type GetTransactionsOptions = {
    ownerView?: boolean;
    page?: number;
    limit?: number;
};

export async function getTransactionsPage(
    userId: string,
    options: GetTransactionsOptions = {}
) {
    try {
        const ownerView = options.ownerView === true;
        const requestedPage = typeof options.page === "number" && Number.isFinite(options.page)
            ? Math.max(1, Math.floor(options.page))
            : 1;
        const limit = typeof options.limit === "number" && Number.isFinite(options.limit)
            ? Math.min(100, Math.max(1, Math.floor(options.limit)))
            : 50;
        const where: Prisma.TransactionWhereInput = ownerView
            ? {
                OR: [
                    { listing: { userId } },
                    { reservation: { listing: { userId } } },
                ],
            }
            : { userId };

        const total = await prisma.transaction.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const page = Math.min(requestedPage, totalPages);
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                reservation: {
                    select: {
                        id: true,
                        bookingId: true,
                        startDate: true,
                        user: {
                            select: {
                                name: true,
                            },
                        },
                        listing: {
                            select: {
                                title: true,
                            },
                        },
                    },
                },
                listing: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Customer invoices for these payments, in one query. Only stored PDFs are linked; the
        // document route checks that the viewer is the customer or the studio's owner.
        const invoices = transactions.length > 0
            ? await prisma.invoice.findMany({
                where: {
                    transactionId: { in: transactions.map((transaction) => transaction.id) },
                    documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
                    invoiceUrl: { not: "" },
                },
                select: { id: true, invoiceNumber: true, transactionId: true },
                orderBy: { createdAt: "desc" },
            })
            : [];
        const invoiceByTransaction = new Map<string, { id: string; invoiceNumber: string }>();
        for (const invoice of invoices) {
            if (invoice.transactionId && !invoiceByTransaction.has(invoice.transactionId)) {
                invoiceByTransaction.set(invoice.transactionId, invoice);
            }
        }

        const transformedTransactions = transactions.map((transaction) => ({
            id: transaction.id,
            businessName:
                transaction.listing?.title ||
                transaction.reservation?.listing?.title ||
                'N/A',
            merchant: transaction.paymentMethod || 'Unknown',
            date: transaction.createdAt.toISOString(),
            customerName: transaction.reservation?.user?.name || transaction.user?.name || 'N/A',
            amount: transaction.amount,
            currency: 'INR',
            status: mapTransactionStatus(transaction.status),
            reservationId: transaction.reservationId || undefined,
            listingId: transaction.listingId || undefined,
            bookingId: transaction.bookingId || transaction.reservation?.bookingId || undefined,
            invoiceId: invoiceByTransaction.get(transaction.id)?.id,
            invoiceNumber: invoiceByTransaction.get(transaction.id)?.invoiceNumber,
        }));

        return {
            transactions: transformedTransactions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    } catch (error: unknown) {
        console.error("Failed to fetch transactions", error);
        throw error;
    }
}

export default async function getTransactions(userId: string, options: GetTransactionsOptions = {}) {
    return (await getTransactionsPage(userId, options)).transactions;
}
