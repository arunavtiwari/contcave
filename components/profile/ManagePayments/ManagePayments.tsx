"use client";
import React, { useCallback, useState } from "react";
import { FiClock, FiCreditCard } from "react-icons/fi";

import PaymentDetails, { PaymentDetailsSkeleton } from "@/components/profile/ManagePayments/PaymentDetails";
import TransactionHistory from "@/components/profile/ManagePayments/TransactionHistory";
import Heading from "@/components/ui/Heading";
import Skeleton from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { PaymentProfile } from "@/types/payment";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

interface Props {
    profile: SafeUser | null;
    paymentDetails?: PaymentProfile | null;
    transactions?: Transaction[];
    paymentDataLoading?: boolean;
    onPaymentDetailsUpdate?: (newPaymentDetails: PaymentProfile) => void;
}

type TabType = "Transaction History" | "Payment Details";

const ManagePayments: React.FC<Props> = ({
    profile,
    paymentDetails: propPaymentDetails,
    transactions: propTransactions,
    paymentDataLoading,
    onPaymentDetailsUpdate
}) => {
    const [selectedTab, setSelectedTab] = useState<TabType>("Payment Details");

    const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }, []);

    const handleTabChange = useCallback((tab: TabType) => {
        if (tab === selectedTab) return;
        setSelectedTab(tab);
    }, [selectedTab]);

    const handleSave = useCallback(async (form: FormData, isEditing: boolean = false): Promise<void> => {
        if (!form) {
            throw new Error('No form data provided');
        }

        if (!form.has('userId') && profile?.id) {
            form.append('userId', profile.id);
        }

        const sanitizedForm = new FormData();
        let accountNumberMasked = false;

        form.forEach((value, key) => {
            if (key === 'accountNumber') {
                const stringVal = value?.toString() ?? '';
                if (/\*+/.test(stringVal)) {
                    accountNumberMasked = true;
                    return;
                }
            }
            if (key === 'gstin') {
                const stringVal = value?.toString() ?? '';
                if (/\*+/.test(stringVal)) {
                    return;
                }
            }
            sanitizedForm.append(key, value);
        });

        let requiredFields = [
            'userId',
            'accountHolderName',
            'bankName',
            'accountNumber',
            'ifscCode'
        ];

        if (accountNumberMasked || !sanitizedForm.has('accountNumber')) {
            requiredFields = requiredFields.filter(field => field !== 'accountNumber');
        }

        const missingOrEmptyFields = requiredFields.filter(field => {
            const hasField = form.has(field);
            const value = form.get(field);
            if (!hasField && !isEditing) return true;
            if (hasField && (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))) {
                return true;
            }
            return false;
        });

        if (missingOrEmptyFields.length > 0) {
            throw new Error(`Missing or empty required fields: ${missingOrEmptyFields.join(', ')}`);
        }

        const finalAccountNumber = form.get('accountNumber') as string;
        const isMasked = finalAccountNumber && (finalAccountNumber.includes('*') || /^\*+$/.test(finalAccountNumber));

        if (finalAccountNumber && !isMasked) {
            const cleanAccountNumber = finalAccountNumber.trim();
            if (!/^\d+$/.test(cleanAccountNumber)) throw new Error('Account number must contain only digits');
            if (cleanAccountNumber.length < 9) throw new Error('Account number must be at least 9 digits');
            if (cleanAccountNumber.length > 20) throw new Error('Account number must be 20 digits or less');
        } else if (isMasked) {
            form.delete('accountNumber');
        }

        try {
            const data = await apiCall('/api/payment-details', {
                method: 'POST',
                body: form,
                headers: {},
            });

            if (!data.success) {
                throw new Error(data.error || 'Save failed');
            }

            if (data.data) {
                onPaymentDetailsUpdate?.(data.data);
            }
            return data;
        } catch (error) {
            console.error('Error saving payment details:', error);
            throw error;
        }
    }, [profile?.id, apiCall, onPaymentDetailsUpdate]);

    if (paymentDataLoading) {
        return (
            <div className="flex flex-col w-full gap-8">
                <Heading
                    title="Manage Payments"
                    subtitle="View your payment details and past transactions."
                />
                <PaymentTabsSkeleton />
                <PaymentDetailsSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-8">
            <Heading
                title="Manage Payments"
                subtitle="View your payment details and past transactions."
            />

            <Tabs
                value={selectedTab}
                onValueChange={(val) => handleTabChange(val as TabType)}
                className="w-full gap-6"
            >
                <TabsList>
                    <TabsTrigger value="Payment Details" icon={FiCreditCard}>
                        Payment Details
                    </TabsTrigger>
                    <TabsTrigger
                        value="Transaction History"
                        icon={FiClock}
                        count={propTransactions && propTransactions.length > 0 ? propTransactions.length : undefined}
                    >
                        Transaction History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="Payment Details" className="w-full">
                    <PaymentDetails
                        profile={profile}
                        paymentDetails={propPaymentDetails}
                        onSave={handleSave}
                    />
                </TabsContent>

                <TabsContent value="Transaction History" className="w-full">
                    <TransactionHistory
                        transactions={propTransactions || []}
                        loading={paymentDataLoading || false}
                        error={null}
                        onRetry={() => { }}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export function PaymentTabsSkeleton() {
    return (
        <div className="inline-flex w-fit flex-nowrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-7 w-38 rounded-lg" />
        </div>
    );
}

export default ManagePayments;
