"use client";
import React from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { formatINR, formatISTDate, formatISTTime } from "@/lib/utils";
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
    const getStatusVariant = (status: string): "success" | "warning" | "destructive" | "neutral" => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'successful':
            case 'success':
                return 'success';
            case 'failed':
            case 'failure':
                return 'destructive';
            default:
                return 'neutral';
        }
    };

    const formatDate = (dateString: string | Date) => {
        const datePart = formatISTDate(dateString, { day: 'numeric', month: 'short', year: 'numeric' });
        const timePart = formatISTTime(dateString);
        return { datePart, timePart };
    };

    const formatCurrency = (amount: number, _currency: string = ''): string => {
        return formatINR(amount);
    };

    const getBusinessName = (transaction: Transaction): string => {
        return transaction.businessName || 'N/A';
    };

    const getCustomerName = (transaction: Transaction): string => {
        return transaction.customerName || 'N/A';
    };


    if (loading) {
        return (
            <div className="flex flex-col w-full gap-5">
                <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
                    <p className="text-muted-foreground mt-4">Loading transactions...</p>
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="flex flex-col w-full gap-5">
                <div className="text-center py-10">
                    <p className="text-destructive mb-4">{error}</p>
                    {onRetry && (
                        <div className="flex justify-center">
                            <Button
                                label="Retry"
                                rounded
                                onClick={onRetry}
                                classNames="w-auto px-4"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }


    if (!transactions || transactions.length === 0) {
        return (
            <div className="flex flex-col w-full gap-5">
                <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
                <div className="text-center py-10">
                    <p className="text-muted-foreground">No transactions found</p>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col w-full gap-5">
            <Heading title="Transaction History" subtitle="View your past transactions." variant="h4"></Heading>
            <div className="space-y-6">
                {transactions.map((transaction, index) => {
                    const { datePart, timePart } = formatDate(transaction.date);
                    const businessName = getBusinessName(transaction);
                    const customerName = getCustomerName(transaction);
                    const details = [
                        { label: "Customer", value: customerName },
                        {
                            label: "Booking ID",
                            value: transaction.bookingId ? `#${transaction.bookingId}` : "N/A",
                            valueClassName: "break-all"
                        },
                        { label: "Amount", value: formatCurrency(transaction.amount, transaction.currency) },
                        {
                            label: "Status",
                            value: (
                                <Pill
                                    label={transaction.status}
                                    variant={getStatusVariant(transaction.status)}
                                    size="xs"
                                />
                            )
                        }
                    ];

                    return (
                        <div
                            key={transaction.id || index}
                            className="flex flex-col gap-5 rounded-xl border border-border p-5 lg:flex-row lg:items-center"
                        >
                            <div className="w-full min-w-0 lg:basis-[42%] flex flex-col gap-1">
                                <div className="text-sm font-normal">
                                    {businessName}
                                </div>
                                <div className="text-sm font-semibold">
                                    <span>{datePart} </span>|
                                    <span> {timePart}</span>
                                </div>
                            </div>
                            <div className="w-full lg:basis-[58%]">
                                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                                    {details.map(({ label, value, valueClassName }, idx) => (
                                        <div key={idx} className="min-w-0 text-left lg:text-center flex flex-col gap-1 items-center">
                                            <div className="text-sm font-semibold text-muted-foreground">{label}</div>
                                            <div className={`text-sm font-semibold text-foreground wrap-break-word ${valueClassName ?? ""}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TransactionHistory;


