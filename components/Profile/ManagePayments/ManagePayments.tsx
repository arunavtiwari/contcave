"use client";
import React, { useState, useCallback, useMemo } from "react";
import Heading from "@/components/Heading";
import TransactionHistory from "@/components/Profile/ManagePayments/TransactionHistory";
import PaymentDetails from "@/components/Profile/ManagePayments/PaymentDetails";

// Types
interface Transaction {
    id: string;
    businessName?: string;
    merchant?: string;
    date: string | Date;
    guestName?: string;
    customerName?: string;
    amount: number;
    currency?: string;
    status: TransactionStatus;
}

type TransactionStatus = 'Pending' | 'Successful' | 'Success' | 'Failed' | 'Failure';

interface Profile {
    id: string;
    name?: string;
    email?: string;
    [key: string]: any;
}

interface Props {
    profile: Profile;
    paymentDetails?: any;
    transactions?: Transaction[];
    paymentDataLoaded?: boolean;
    paymentDataLoading?: boolean;
    onPaymentDetailsUpdate?: (newPaymentDetails: any) => void;
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

    const handleSave = useCallback(async (form: FormData, isEditing: boolean = false): Promise<any> => {
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
            sanitizedForm.append(key, value);
        });

        let requiredFields = [
            'userId',
            'accountHolderName',
            'bankName',
            'accountNumber',
            'ifscCode',
            'taxIdentificationNumber',
            'taxResidencyInformation'
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
        if (finalAccountNumber) {
            const cleanAccountNumber = finalAccountNumber.trim();
            if (!/^\d+$/.test(cleanAccountNumber)) throw new Error('Account number must contain only digits');
            if (cleanAccountNumber.length < 9) throw new Error('Account number must be at least 9 digits');
            if (cleanAccountNumber.length > 18) throw new Error('Account number must be 18 digits or less');
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

    const renderSelectedComponent = useMemo(() => {
        const commonProps = { profile };

        switch (selectedTab) {
            case "Transaction History":
                return (
                    <TransactionHistory
                        {...commonProps}
                        transactions={propTransactions || []}
                        loading={paymentDataLoading || false}
                        error={null}
                        onRetry={() => { }}
                    />
                );
            case "Payment Details":
            default:
                return (
                    <PaymentDetails
                        {...commonProps}
                        paymentDetails={propPaymentDetails}
                        onSave={handleSave}
                    />
                );
        }
    }, [selectedTab, profile, propTransactions, paymentDataLoading, handleSave, propPaymentDetails]);

    const tabIndicatorStyles = useMemo(() => ({
        left: selectedTab === "Transaction History" ? "0.25rem" : "50%",
        right: selectedTab === "Transaction History" ? "50%" : "0.25rem",
    }), [selectedTab]);

    if (paymentDataLoading) {
        return (
            <div className="flex flex-col w-full gap-5">
                <Heading
                    title="Manage Payments"
                    subtitle="View your payment details and past transactions."
                />
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading payment data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-5">
            <Heading
                title="Manage Payments"
                subtitle="View your payment details and past transactions."
            />

            {/* Tab Navigation */}
            <nav
                className="relative inline-flex bg-gray-100 rounded-full p-1 w-fit self-center border border-gray-200"
                role="tablist"
                aria-label="Payment management tabs"
            >
                {/* Sliding indicator */}
                <div
                    className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out"
                    style={tabIndicatorStyles}
                    aria-hidden="true"
                />

                {/* Tab buttons */}
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={selectedTab === tab}
                        aria-controls={`${tab.toLowerCase().replace(' ', '-')}-panel`}
                        className={`relative z-10 px-6 py-3 rounded-full text-base font-medium transition-colors duration-200 ${selectedTab === tab
                            ? "text-black"
                            : "text-gray-600 hover:text-gray-900"
                            }`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {/* Content Area */}
            <main
                role="tabpanel"
                id={`${selectedTab.toLowerCase().replace(' ', '-')}-panel`}
                aria-labelledby={`${selectedTab.toLowerCase().replace(' ', '-')}-tab`}
            >
                {renderSelectedComponent}
            </main>
        </div>
    );
};

export default ManagePayments;