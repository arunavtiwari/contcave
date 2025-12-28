import { NextRequest } from 'next/server';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { createSuccessResponse, handleRouteError } from "@/lib/api-utils";

const prisma = new PrismaClient();

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ profileId: string }> }
) {
    const { profileId } = await context.params;
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: profileId },
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
                        startDate: true,
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
        });

        const transformedTransactions = transactions.map((transaction) => ({
            id: transaction.id,
            businessName:
                transaction.listing?.title ||
                transaction.reservation?.listing?.title ||
                'N/A',
            merchant: transaction.paymentMethod || 'PhonePe',
            date: transaction.createdAt,
            guestName: transaction.user?.name || 'N/A',
            customerName: transaction.user?.name || 'N/A',
            amount: transaction.amount,
            currency: '₹',
            status: mapTransactionStatus(transaction.status),
        }));

        return createSuccessResponse({
            success: true,
            transactions: transformedTransactions,
        });
    } catch (error) {
        return handleRouteError(error, "GET /api/transactions/[profileId]");
    } finally {
        await prisma.$disconnect();
    }
}

function mapTransactionStatus(
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
