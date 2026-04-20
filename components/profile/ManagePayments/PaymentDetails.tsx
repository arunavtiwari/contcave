"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { PaymentProfile } from "@/types/payment";
import { SafeUser } from "@/types/user";


interface BankField {
    label: string;
    name: string;
    type: string;
    required: boolean;
    maxLength?: number;
    pattern?: string;
}

interface TaxField {
    label: string;
    name: string;
    required: boolean;
    maxLength?: number;
    pattern?: string;
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
        <div className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
            <label
                htmlFor={field.name}
                className="text-base font-bold text-foreground"
            >
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="flex flex-col">
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
                    className={`
                        h-11
                        w-full
                        rounded-xl
                        border
                        bg-background
                        px-4
                        font-light
                        outline-none
                        transition
                        disabled:cursor-not-allowed
                        disabled:opacity-70
                        ${error ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20" : "border-border focus:border-foreground focus:ring-1 focus:ring-foreground/10"}
                    `}
                    aria-describedby={error ? `${field.name}-error` : undefined}
                />
                {error && (
                    <span
                        id={`${field.name}-error`}
                        className="ml-1 mt-1 text-sm text-destructive"
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


const PaymentDetails: React.FC<PaymentDetailsProps> = ({ profile, paymentDetails, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [originalData, setOriginalData] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasExistingData, setHasExistingData] = useState(false);


    const BANK_FIELDS: BankField[] = useMemo(() => [
        {
            label: "Account Holder Name",
            name: "accountHolderName",
            type: "text",
            required: true,
            maxLength: 100
        },
        {
            label: "Bank Name",
            name: "bankName",
            type: "text",
            required: true,
            maxLength: 50
        },
        {
            label: "Account Number",
            name: "accountNumber",
            type: "text",
            required: true,
            pattern: "[0-9]+"
        },
        {
            label: "Re-enter Account Number",
            name: "reAccountNumber",
            type: "text",
            required: true,
            maxLength: 20,
            pattern: "[0-9]+"
        },
        {
            label: "IFSC Code (India)",
            name: "ifscCode",
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
            required: false,
            maxLength: 100
        },
        {
            label: "GSTIN (optional)",
            name: "gstin",
            required: false,
            maxLength: 15,
            pattern: "[0-9A-Z]{15}"
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


    useEffect(() => {
        const data = initializeFormData(paymentDetails || null);
        setFormData(data);
        setOriginalData(data);
        setHasExistingData(!!paymentDetails && Object.keys(paymentDetails).length > 1);
    }, [paymentDetails, initializeFormData]);


    const handleFieldChange = useCallback((name: string, value: string) => {
        const normalizedValue = name === "gstin" ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: normalizedValue }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};


        [...BANK_FIELDS, ...TAX_FIELDS].forEach(field => {
            if (field.required && !formData[field.name]?.trim()) {
                newErrors[field.name] = `${field.label} is required`;
            }
        });


        if (formData.accountNumber && formData.reAccountNumber) {
            if (formData.accountNumber !== formData.reAccountNumber) {
                newErrors.reAccountNumber = 'Account numbers do not match';
            }
        }


        if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
            newErrors.ifscCode = 'Invalid IFSC code format';
        }

        if (formData.gstin && !/^[0-9A-Z]{15}$/i.test(formData.gstin)) {
            if (formData.gstin !== originalData.gstin) {
                if (!/^[0-9A-Z]{15}$/i.test(formData.gstin)) {
                    newErrors.gstin = 'Invalid GSTIN format';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, originalData.gstin, BANK_FIELDS, TAX_FIELDS]);

    const hasChanges = useMemo(() => {
        return Object.keys(formData).some(key => formData[key] !== originalData[key]);
    }, [formData, originalData]);

    const handleModify = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!validateForm()) {
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

                const fieldsToSend = ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'companyName', 'gstin'];
                fieldsToSend.forEach(key => {
                    const val = formData[key]?.trim();
                    if (val !== undefined && val !== '' && !val.includes('*')) {
                        form.append(key, key === 'gstin' || key === 'ifscCode' ? val.toUpperCase() : val);
                    }
                });

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
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <Heading
                        title="Bank Account Information"
                        subtitle="Provide your Bank information."
                        variant="h4"
                    />
                    
                    <div className="flex h-fit gap-2 md:justify-end">
                        {isEditing ? (
                            <>
                                <Button
                                    label="Cancel"
                                    variant="secondary"
                                    disabled={isPending}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleCancel();
                                    }}
                                />
                                <Button
                                    label={isPending ? "Saving..." : "Save"}
                                    disabled={isPending || !hasChanges}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSave();
                                    }}
                                />
                            </>
                        ) : (
                            <Button
                                label="Modify"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleModify();
                                }}
                            />
                        )}
                    </div>
                </div>


                <fieldset className="space-y-4 rounded-xl border border-border p-6">
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


                <Heading
                    title="Tax Information"
                    subtitle="Provide your tax information."
                    variant="h4"
                />


                <fieldset className="space-y-4 rounded-xl border border-border p-6">
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


                {isEditing && hasChanges && (
                    <div className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
                        You have unsaved changes
                    </div>
                )}
            </form>
        </div>
    );
};

export default PaymentDetails;

