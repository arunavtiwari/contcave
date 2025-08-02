import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;

        const transactions = await prisma.transaction.findMany({
            where: {
                userId
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                reservation: {
                    select: {
                        id: true,
                        startDate: true,
                        listing: {
                            select: {
                                title: true
                            }
                        }
                    }
                },
                listing: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const transformedTransactions = transactions.map((transaction) => ({
            id: transaction.id,
            businessName:
                transaction.listing?.title || transaction.reservation?.listing?.title || 'N/A',
            merchant: transaction.paymentMethod || 'PhonePe',
            date: transaction.createdAt,
            guestName: transaction.user?.name || 'N/A',
            customerName: transaction.user?.name || 'N/A',
            amount: transaction.amount,
            currency: '₹',
            status: mapTransactionStatus(transaction.status)
        }));

        return NextResponse.json({
            success: true,
            transactions: transformedTransactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transactions' },
            { status: 500 }
        );
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
