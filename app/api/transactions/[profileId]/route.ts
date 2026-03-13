import { TransactionStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ profileId: string }> }
) {
    try {
        const { profileId } = await context.params;

        if (!profileId || typeof profileId !== "string" || profileId.trim().length === 0) {
            return createErrorResponse("Invalid profile ID", 400);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        if (currentUser.id !== profileId) {
            return createErrorResponse("You can only view your own transactions", 403);
        }

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
