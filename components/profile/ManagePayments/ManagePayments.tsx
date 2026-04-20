"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PaymentDetails from "@/components/profile/ManagePayments/PaymentDetails";
import TransactionHistory from "@/components/profile/ManagePayments/TransactionHistory";
import Heading from "@/components/ui/Heading";
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

const TABS = ["Transaction History", "Payment Details"] as const;
type TabType = typeof TABS[number];

const ManagePayments: React.FC<Props> = ({
    profile,
    paymentDetails: propPaymentDetails,
    transactions: propTransactions,
    paymentDataLoading,
    onPaymentDetailsUpdate
}) => {
    const [selectedTab, setSelectedTab] = useState<TabType>("Payment Details");
    const [panelMinHeight, setPanelMinHeight] = useState(0);
    const transactionPanelRef = useRef<HTMLDivElement | null>(null);
    const paymentPanelRef = useRef<HTMLDivElement | null>(null);

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

    const updatePanelMinHeight = useCallback(() => {
        const transactionHeight = transactionPanelRef.current?.scrollHeight ?? 0;
        const paymentHeight = paymentPanelRef.current?.scrollHeight ?? 0;
        const maxHeight = Math.max(transactionHeight, paymentHeight);

        if (maxHeight > 0) {
            setPanelMinHeight((prev) => (prev === maxHeight ? prev : maxHeight));
        }
    }, []);

    useEffect(() => {
        updatePanelMinHeight();
    }, [updatePanelMinHeight, selectedTab, propTransactions, propPaymentDetails, paymentDataLoading]);

    useEffect(() => {
        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(() => {
            updatePanelMinHeight();
        });

        if (transactionPanelRef.current) {
            observer.observe(transactionPanelRef.current);
        }
        if (paymentPanelRef.current) {
            observer.observe(paymentPanelRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [updatePanelMinHeight]);

    const tabIndicatorStyles = useMemo(() => ({
        left: selectedTab === "Transaction History" ? "0.25rem" : "52%",
        right: selectedTab === "Transaction History" ? "48%" : "0.25rem",
    }), [selectedTab]);

    const getTabSlug = useCallback((tab: TabType) => tab.toLowerCase().replace(/\s+/g, '-'), []);

    if (paymentDataLoading) {
        return (
            <div className="flex flex-col w-full gap-8">
                <Heading
                    title="Manage Payments"
                    subtitle="View your payment details and past transactions."
                />
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                    <span className="ml-2 text-muted-foreground">Loading payment data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-8">
            <Heading
                title="Manage Payments"
                subtitle="View your payment details and past transactions."
            />


            <nav
                className="relative inline-flex bg-muted rounded-full p-1 w-fit self-center border border-border"
                role="tablist"
                aria-label="Payment management tabs"
            >

                <div
                    className="absolute top-1 bottom-1 rounded-full bg-background transition-all duration-300 ease-in-out"
                    style={tabIndicatorStyles}
                    aria-hidden="true"
                />


                {TABS.map((tab) => {
                    const tabSlug = getTabSlug(tab);

                    return (
                        <button
                            key={tab}
                            id={`${tabSlug}-tab`}
                            type="button"
                            role="tab"
                            aria-selected={selectedTab === tab}
                            aria-controls={`${tabSlug}-panel`}
                            className={`relative z-10 rounded-full px-6 py-3 text-base font-medium transition-colors duration-200 ${selectedTab === tab
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => handleTabChange(tab)}
                        >
                            {tab}
                        </button>
                    );
                })}
            </nav>


            <main
                className="relative w-full"
                style={panelMinHeight > 0 ? { minHeight: `${panelMinHeight}px` } : undefined}
            >
                <section
                    id="transaction-history-panel"
                    role="tabpanel"
                    aria-labelledby="transaction-history-tab"
                    aria-hidden={selectedTab !== "Transaction History"}
                    ref={transactionPanelRef}
                    className={selectedTab === "Transaction History" ? "relative" : "pointer-events-none invisible absolute inset-0"}
                >
                    <TransactionHistory
                        transactions={propTransactions || []}
                        loading={paymentDataLoading || false}
                        error={null}
                        onRetry={() => { }}
                    />
                </section>
                <section
                    id="payment-details-panel"
                    role="tabpanel"
                    aria-labelledby="payment-details-tab"
                    aria-hidden={selectedTab !== "Payment Details"}
                    ref={paymentPanelRef}
                    className={selectedTab === "Payment Details" ? "relative" : "pointer-events-none invisible absolute inset-0"}
                >
                    <PaymentDetails
                        profile={profile}
                        paymentDetails={propPaymentDetails}
                        onSave={handleSave}
                    />
                </section>
            </main>
        </div>
    );
};

export default ManagePayments;

