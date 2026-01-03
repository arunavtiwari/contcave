"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo,useState, useTransition } from "react";
import { toast } from "react-toastify";

import Heading from "@/components/Heading";
import { PaymentProfile } from "@/types/payment";
import { SafeUser } from "@/types/user";

// Types
interface BankField {
    label: string;
    name: string;
    value: string;
    type: string;
    required: boolean;
    maxLength?: number;
    pattern?: string;
}

interface TaxField {
    label: string;
    name: string;
    value: string;
    required: boolean;
    maxLength?: number;
}


interface PaymentDetailsProps {
    profile?: SafeUser | PaymentProfile | null;
    paymentDetails?: PaymentProfile | null;
    onSave?: (data: FormData, isEditing?: boolean) => Promise<void>;
}

const FieldInput = React.memo<{
    field: BankField | TaxField;
    value: string;
    onChange: (name: string, value: string) => void;
    isEditing: boolean;
    error?: string;
}>(({ field, value, onChange, isEditing, error }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(field.name, e.target.value);
    }, [field.name, onChange]);

    return (
        <div className="flex flex-wrap items-center mb-4 xl:flex-nowrap">
            <label
                htmlFor={field.name}
                className="text-base w-full xl:w-[300px] font-bold text-slate-950 mb-2 xl:mb-0"
            >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex flex-col w-full xl:w-[calc(100%-300px)]">
                <div className={`flex items-center w-full h-10 bg-white border px-2 rounded-full transition-colors ${error ? 'border-red-400' : 'border-slate-400 focus-within:border-blue-500'
                    }`}>
                    <input
                        type={('type' in field) ? field.type : 'text'}
                        id={field.name}
                        name={field.name}
                        value={value}
                        onChange={handleChange}
                        disabled={!isEditing}
                        required={field.required}
                        maxLength={field.maxLength}
                        pattern={('pattern' in field) ? field.pattern : undefined}
                        className="flex-1 h-10 border-0 bg-transparent focus:ring-0 focus:outline-none px-2 disabled:opacity-60"
                        aria-describedby={error ? `${field.name}-error` : undefined}
                    />
                    {isEditing && (
                        <div className="w-4 h-4 shrink-0">
                            <Image
                                src="/assets/edit.svg"
                                width={16}
                                height={16}
                                alt="Edit field"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </div>
                {error && (
                    <span
                        id={`${field.name}-error`}
                        className="text-red-500 text-sm mt-1 ml-2"
                        role="alert"
                    >
                        {error}
                    </span>
                )}
            </div>
        </div>
    );
});

FieldInput.displayName = 'FieldInput';

// Main Component
const PaymentDetails: React.FC<PaymentDetailsProps> = ({ profile, paymentDetails, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [originalData, setOriginalData] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasExistingData, setHasExistingData] = useState(false);

    // Field definitions
    const BANK_FIELDS: BankField[] = useMemo(() => [
        {
            label: "Account Holder Name",
            name: "accountHolderName",
            value: "",
            type: "text",
            required: true,
            maxLength: 100
        },
        {
            label: "Bank Name",
            name: "bankName",
            value: "",
            type: "text",
            required: true,
            maxLength: 50
        },
        {
            label: "Account Number",
            name: "accountNumber",
            value: "",
            type: "text",
            required: true,
            maxLength: 20,
            pattern: "[0-9-]+"
        },
        {
            label: "Re-enter Account Number",
            name: "reAccountNumber",
            value: "",
            type: "text",
            required: true,
            maxLength: 20,
            pattern: "[0-9-]+"
        },
        {
            label: "IFSC Code (India)",
            name: "ifscCode",
            value: "",
            type: "text",
            required: true,
            maxLength: 11,
            pattern: "[A-Z]{4}0[A-Z0-9]{6}"
        },
    ], []);

    const TAX_FIELDS: TaxField[] = useMemo(() => [
        {
            label: "Company Name (optional)",
            name: "companyName",
            value: "",
            required: false,
            maxLength: 100
        },
        {
            label: "GSTIN (optional)",
            name: "gstin",
            value: "",
            required: false,
            maxLength: 15
        }
    ], []);

    const initializeFormData = useCallback((profileData: SafeUser | PaymentProfile | null) => {
        const initialData: Record<string, string> = {};

        [...BANK_FIELDS, ...TAX_FIELDS].forEach(field => {
            initialData[field.name] = '';
        });

        if (profileData) {
            const data = profileData as unknown as PaymentProfile;
            initialData.accountHolderName = data.accountHolderName || '';
            initialData.bankName = data.bankName || '';
            initialData.accountNumber = data.accountNumber || '';
            initialData.reAccountNumber = data.accountNumber || '';
            initialData.ifscCode = data.ifscCode || '';
            initialData.companyName = data.companyName || '';
            initialData.gstin = data.gstin || '';
        }

        return initialData;
    }, [BANK_FIELDS, TAX_FIELDS]);

    // Initialize form data when payment details change
    useEffect(() => {
        const data = initializeFormData(paymentDetails || null);
        setFormData(data);
        setOriginalData(data);
        setHasExistingData(!!paymentDetails && Object.keys(paymentDetails).length > 1);
    }, [paymentDetails, initializeFormData]);

    // Handlers
    const handleFieldChange = useCallback((name: string, value: string) => {
        const normalizedValue = name === "gstin" ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: normalizedValue }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate required fields
        [...BANK_FIELDS, ...TAX_FIELDS].forEach(field => {
            if (field.required && !formData[field.name]?.trim()) {
                newErrors[field.name] = `${field.label} is required`;
            }
        });

        // Custom validations
        if (formData.accountNumber && formData.reAccountNumber) {
            if (formData.accountNumber !== formData.reAccountNumber) {
                newErrors.reAccountNumber = 'Account numbers do not match';
            }
        }

        // IFSC code validation
        if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
            newErrors.ifscCode = 'Invalid IFSC code format';
        }

        if (formData.gstin && !/^[0-9A-Z]{15}$/i.test(formData.gstin)) {
            newErrors.gstin = 'Invalid GSTIN format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, BANK_FIELDS, TAX_FIELDS]);

    const hasChanges = useMemo(() => {
        return Object.keys(formData).some(key => formData[key] !== originalData[key]);
    }, [formData, originalData]);

    const handleModify = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors before saving');
            return;
        }

        if (!hasChanges) {
            toast.info('No changes to save');
            setIsEditing(false);
            return;
        }

        startTransition(async () => {
            try {
                const form = new FormData();

                if (profile?.id) {
                    form.append('userId', profile.id);
                } else if ((profile as unknown as PaymentProfile)?.userId) {
                    form.append('userId', (profile as unknown as PaymentProfile).userId!);
                }

                form.append('accountHolderName', formData.accountHolderName || '');
                form.append('bankName', formData.bankName || '');

                // Handle masked account numbers
                const isMasked = /^\*+$/.test(formData.accountNumber.trim()) || /\*{3,}/.test(formData.accountNumber.trim());
                if (!isMasked) {
                    form.append('accountNumber', formData.accountNumber || '');
                }

                form.append('ifscCode', formData.ifscCode || '');
                if (formData.companyName?.trim()) {
                    form.append('companyName', formData.companyName.trim());
                }
                if (formData.gstin?.trim() && !formData.gstin.includes('*')) {
                    form.append('gstin', formData.gstin.trim().toUpperCase());
                }
                form.append('updatedAt', new Date().toISOString());

                await onSave?.(form, hasExistingData);

                setOriginalData({ ...formData });
                setIsEditing(false);
                setHasExistingData(true);
                toast.success('Payment details saved successfully');
            } catch (error) {
                console.error('Save error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to save payment details';
                toast.error(errorMessage);
            }
        });
    }, [formData, validateForm, onSave, profile, hasChanges, hasExistingData]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setErrors({});
        setFormData({ ...originalData });
    }, [originalData]);

    return (
        <div className="flex flex-col w-full gap-5">
            <form onSubmit={(e) => e.preventDefault()} className="xl:space-y-8 lg:space-y-8 md:space-y-8 space-y-3">
                {/* Bank Info Header */}
                <div className="flex justify-between items-start">
                    <Heading
                        title="Bank Account Information"
                        subtitle="Provide your Bank information."
                        headingSmall
                    />

                    {/* Action Buttons */}
                    <div className="flex h-fit gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isPending}
                                    className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isPending || !hasChanges}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center transition-colors"
                                >
                                    {isPending ? 'Saving...' : 'Save'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleModify}
                                className="bg-black hover:bg-gray-800 flex items-center justify-center text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center transition-colors"
                            >
                                Modify
                            </button>
                        )}
                    </div>
                </div>

                {/* Bank Information Fields */}
                <fieldset className="relative space-y-4 mt-3 p-6 rounded-xl border border-gray-200">
                    <legend className="sr-only">Bank Account Information</legend>
                    {BANK_FIELDS.map((field) => (
                        <FieldInput
                            key={field.name}
                            field={field}
                            value={formData[field.name] || ''}
                            onChange={handleFieldChange}
                            isEditing={isEditing}
                            error={errors[field.name]}
                        />
                    ))}
                </fieldset>

                {/* Tax Information Header */}
                <Heading
                    title="Tax Information"
                    subtitle="Provide your tax information."
                    headingSmall
                />

                {/* Tax Information Fields */}
                <fieldset className="relative space-y-4 p-6 rounded-xl border border-gray-200">
                    <legend className="sr-only">Tax Information</legend>
                    {TAX_FIELDS.map((field) => (
                        <FieldInput
                            key={field.name}
                            field={field}
                            value={formData[field.name] || ''}
                            onChange={handleFieldChange}
                            isEditing={isEditing}
                            error={errors[field.name]}
                        />
                    ))}
                </fieldset>

                {/* Change indicator */}
                {isEditing && hasChanges && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                        You have unsaved changes
                    </div>
                )}
            </form>
        </div>
    );
};

export default PaymentDetails;
