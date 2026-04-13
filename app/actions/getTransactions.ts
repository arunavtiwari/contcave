import { TransactionStatus } from '@prisma/client';

import prisma from "@/lib/prismadb";

export function mapTransactionStatus(
    status: TransactionStatus
): 'Pending' | 'Successful' | 'Success' | 'Failed' | 'Failure' {
    switch (status) {
        case 'PENDING':
            return 'Pending';
        case 'SUCCESS':
            return 'Successful';
        case 'FAILED':
        case 'CANCELLED':
        case 'EXPIRED':
        case 'REFUNDED':
            return 'Failed';
        default:
            return 'Pending';
    }
}

type GetTransactionsOptions = {
    ownerView?: boolean;
};

export default async function getTransactions(
    userId: string,
    options: GetTransactionsOptions = {}
) {
    try {
        const ownerView = options.ownerView === true;
        const where = ownerView
            ? {
                OR: [
                    { listing: { userId } },
                    { reservation: { listing: { userId } } },
                ],
            }
            : { userId };

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
            take: 1000,
        });

        const transformedTransactions = transactions.map((transaction) => ({
            id: transaction.id,
            businessName:
                transaction.listing?.title ||
                transaction.reservation?.listing?.title ||
                'N/A',
            merchant: transaction.paymentMethod || 'Unknown',
            date: transaction.createdAt,
            guestName: transaction.reservation?.user?.name || transaction.user?.name || 'N/A',
            customerName: transaction.user?.name || 'N/A',
            amount: transaction.amount,
            currency: '₹',
            status: mapTransactionStatus(transaction.status),
            reservationId: transaction.reservationId || undefined,
            listingId: transaction.listingId || undefined,
            bookingId: transaction.bookingId || transaction.reservation?.bookingId || undefined,
        }));

        return transformedTransactions;
    } catch (error: unknown) {
        console.error("Failed to fetch transactions", error);
        return [];
    }
}
