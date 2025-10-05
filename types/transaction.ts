import { TransactionStatus } from '@prisma/client';

export interface Transaction {
    id: string;
    businessName?: string;
    merchant?: string;
    date: string | Date;
    guestName?: string;
    customerName?: string;
    amount: number;
    currency?: string;
    status: TransactionStatus;
    description?: string;
    paymentMethod?: string;
    merchantTransactionId?: string;
    phonePeTransactionId?: string;
    reservationId?: string;
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
