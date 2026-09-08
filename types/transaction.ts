import type { TransactionStatus } from '@prisma/client';

export type TransactionDisplayStatus = 'Pending' | 'Successful' | 'Failed' | 'Refunded';

export interface Transaction {
    id: string;
    businessName?: string;
    merchant?: string;
    date: string;
    guestName?: string;
    customerName?: string;
    amount: number;
    currency?: string;
    status: TransactionDisplayStatus;
    description?: string;
    paymentMethod?: string;
    merchantTransactionId?: string;
    reservationId?: string;
    bookingId?: string;
    listingId?: string;
    failureReason?: string;
}

export interface CreateTransactionData {
    userId: string;
    reservationId?: string;
    listingId?: string;
    amount: number;
    description?: string;
    customerPhone?: string;
    customerEmail?: string;
}

export interface TransactionFilters {
    status?: TransactionStatus;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface TransactionResponse {
    transactions: Transaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
