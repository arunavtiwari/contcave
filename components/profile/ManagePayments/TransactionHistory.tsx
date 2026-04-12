"use client";
import React from "react";

import Heading from "@/components/ui/Heading";
import { Transaction } from "@/types/transaction";



interface TransactionHistoryProps {

    transactions?: Transaction[];
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({

    transactions = [],
    loading = false,
    error = null,
    onRetry
}) => {
    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'text-amber-600';
            case 'successful':
            case 'success':
                return 'text-green-600';
            case 'failed':
            case 'failure':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        const formatted = date.toLocaleDateString('en-US', options);
        const [datePart, timePart] = formatted.split(' at ');
        return { datePart, timePart };
    };

    const formatCurrency = (amount: number, currency: string = '₹'): string => {
        return `${currency} ${amount.toLocaleString()}`;
    };

    const getBusinessName = (transaction: Transaction): string => {
        return transaction.businessName || 'N/A';
    };

    const getCustomerName = (transaction: Transaction): string => {
        return transaction.guestName || transaction.customerName || 'N/A';
    };


    if (loading) {
        return (
            <div className="flex flex-col w-full gap-5">
                <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
                <div className="p-10 rounded-xl border border-gray-200">
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading transactions...</p>
                    </div>
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="flex flex-col w-full gap-5">
                <div className="p-10 rounded-xl border border-gray-200">
                    <div className="text-center py-10">
                        <p className="text-red-500 mb-4">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 bg-black text-white rounded-full hover:opacity-85 transition-opacity"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    if (!transactions || transactions.length === 0) {
        return (
            <div className="flex flex-col w-full gap-5">
                <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
                <div className="p-10 rounded-xl border border-gray-200">
                    <div className="text-center py-10">
                        <p className="text-gray-500">No transactions found</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col w-full gap-5">
            <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
            <div className="p-10 rounded-xl border border-gray-200">
                <div className="space-y-6">
                    {transactions.map((transaction, index) => {
                        const { datePart, timePart } = formatDate(transaction.date);
                        const businessName = getBusinessName(transaction);
                        const customerName = getCustomerName(transaction);

                        return (
                            <div
                                key={transaction.id || index}
                                className="relative flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-center justify-between border border-slate-300 p-6 rounded-xl"
                            >
                                <div className="w-full">
                                    <div className="text-base font-normal">
                                        {businessName}
                                    </div>
                                    <div className="text-base font-semibold">
                                        <span>{datePart} </span>|
                                        <span> {timePart}</span>
                                    </div>
                                </div>
                                <div className="w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                        {[
                                            { label: "Guest", value: customerName },
                                            { label: "Booking ID", value: transaction.bookingId ? `#${transaction.bookingId}` : "N/A" },
                                            { label: "Amount", value: formatCurrency(transaction.amount, transaction.currency) },
                                            {
                                                label: "Status",
                                                value: (
                                                    <span className={`text-base font-medium ${getStatusColor(transaction.status)}`}>
                                                        {transaction.status}
                                                    </span>
                                                )
                                            }
                                        ].map(({ label, value }, idx) => (
                                            <div key={idx} className="text-left md:text-center">
                                                <div className="text-sm font-semibold text-gray-500">{label}</div>
                                                <div className="text-base font-semibold text-slate-900 wrap-break-word">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TransactionHistory;