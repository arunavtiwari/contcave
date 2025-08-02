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
}

class APIError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

// Constants
const TABS = ["Transaction History", "Payment Details"] as const;
type TabType = typeof TABS[number];

const ManagePayments: React.FC<Props> = ({ profile }) => {
    // State management
    const [selectedTab, setSelectedTab] = useState<TabType>("Payment Details");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper function for API calls with better error handling
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
            throw new APIError(
                errorData?.error || `HTTP error! status: ${response.status}`,
                response.status
            );
        }

        return response.json();
    }, []);

    const fetchTransactions = useCallback(async () => {
        if (!profile?.id) {
            console.warn('No profile ID provided for transaction fetch');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await apiCall(`/api/transactions/${profile.id}`);

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch transactions');
            }

            console.log('Fetched transactions:', data.transactions);
            setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to load transactions: ${errorMessage}`);
            console.error('Transaction fetch error:', err);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [profile?.id, apiCall]);

    const handleTabChange = useCallback(async (tab: TabType) => {
        if (tab === selectedTab) return;

        setSelectedTab(tab);

        if (tab === "Transaction History" && transactions.length === 0 && !loading) {
            await fetchTransactions();
        }
    }, [selectedTab, transactions.length, loading, fetchTransactions]);

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
                    console.log('Masked account number detected — skipping');
                    return;
                }
            }
            sanitizedForm.append(key, value);
        });
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
            console.log('=== Form Data Debug ===');
            console.log('Is editing:', isEditing);
            Array.from(form.entries()).forEach(([key, value]) => {
                console.log(`  ${key}:`, value);
            });
        }

        // Validation
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
            console.log('Account number not required in validation');
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
            console.error('Validation failed. Missing or empty fields:', missingOrEmptyFields);
            throw new Error(`Missing or empty required fields: ${missingOrEmptyFields.join(', ')}`);
        }

        // Validate account number if provided
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

            console.log('✅ Payment details saved successfully');
            return data;
        } catch (error) {
            console.error('❌ Error saving payment details:', error);
            throw error;
        }
    }, [profile?.id, apiCall]);


    const handleFetch = useCallback(async (profileId: string) => {
        if (!profileId) {
            throw new Error('Profile ID is required');
        }

        try {
            console.log('Fetching payment details for profileId:', profileId);

            const data = await apiCall(`/api/payment-details/${profileId}`);

            console.log('Fetched payment data:', data);
            return data.success ? (data.data || null) : null;
        } catch (error) {
            if (error instanceof APIError && error.status === 404) {
                console.log('No payment details found - normal for new users');
                return null;
            }

            console.error('Error fetching payment details:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to fetch payment details: ${errorMessage}`);
        }
    }, [apiCall]);

    const renderSelectedComponent = useMemo(() => {
        const commonProps = { profile };

        switch (selectedTab) {
            case "Transaction History":
                return (
                    <TransactionHistory
                        {...commonProps}
                        transactions={transactions}
                        loading={loading}
                        error={error}
                        onRetry={fetchTransactions}
                    />
                );
            case "Payment Details":
                return (
                    <PaymentDetails
                        {...commonProps}
                        onSave={handleSave}
                        onFetch={handleFetch}
                    />
                );
            default:
                return (
                    <PaymentDetails
                        {...commonProps}
                        onSave={handleSave}
                        onFetch={handleFetch}
                    />
                );
        }
    }, [selectedTab, profile, transactions, loading, error, fetchTransactions, handleSave, handleFetch]);

    const tabIndicatorStyles = useMemo(() => ({
        left: selectedTab === "Transaction History" ? "0.25rem" : "50%",
        right: selectedTab === "Transaction History" ? "50%" : "0.25rem",
    }), [selectedTab]);

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