"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Input from "@/components/inputs/Input";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { paymentDetailsFormSchema, PaymentDetailsFormValues } from "@/schemas/payment";
import { PaymentProfile } from "@/types/payment";
import { SafeUser } from "@/types/user";

interface PaymentDetailsProps {
    profile?: SafeUser | PaymentProfile | null;
    paymentDetails?: PaymentProfile | null;
    onSave?: (data: FormData, isEditing?: boolean) => Promise<void>;
}

const DEFAULT_LABEL_WIDTH = "sm:w-72";

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ profile, paymentDetails, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [hasExistingData, setHasExistingData] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<PaymentDetailsFormValues>({
        resolver: zodResolver(paymentDetailsFormSchema),
        defaultValues: {
            accountHolderName: "",
            bankName: "",
            accountNumber: "",
            reAccountNumber: "",
            ifscCode: "",
            companyName: "",
            gstin: "",
        },
    });

    const populateForm = useCallback((data: PaymentProfile | null) => {
        if (data) {
            reset({
                accountHolderName: data.accountHolderName || "",
                bankName: data.bankName || "",
                accountNumber: data.accountNumber || "",
                reAccountNumber: data.accountNumber || "",
                ifscCode: data.ifscCode || "",
                companyName: data.companyName || "",
                gstin: data.gstin || "",
            });
            setHasExistingData(Boolean(data && Object.keys(data).length > 1));
        } else {
            reset({
                accountHolderName: "",
                bankName: "",
                accountNumber: "",
                reAccountNumber: "",
                ifscCode: "",
                companyName: "",
                gstin: "",
            });
            setHasExistingData(false);
        }
    }, [reset]);

    useEffect(() => {
        populateForm(paymentDetails || null);
    }, [paymentDetails, populateForm]);

    const onSubmit = async (values: PaymentDetailsFormValues) => {
        startTransition(async () => {
            try {
                const form = new FormData();
                if (profile?.id) {
                    form.append("userId", profile.id);
                } else if ((profile as unknown as PaymentProfile)?.userId) {
                    form.append("userId", (profile as unknown as PaymentProfile).userId!);
                }

                form.append("accountHolderName", values.accountHolderName.trim());
                form.append("bankName", values.bankName.trim());

                if (values.accountNumber && !values.accountNumber.includes("*")) {
                    form.append("accountNumber", values.accountNumber.trim());
                }

                form.append("ifscCode", values.ifscCode.toUpperCase().trim());

                if (values.companyName) {
                    form.append("companyName", values.companyName.trim());
                }
                if (values.gstin) {
                    form.append("gstin", values.gstin.toUpperCase().trim());
                }

                form.append("updatedAt", new Date().toISOString());

                await onSave?.(form, hasExistingData);

                setIsEditing(false);
                setHasExistingData(true);
                toast.success("Payment details saved successfully");
            } catch (error) {
                console.error("Save error:", error);
                const errorMessage = error instanceof Error ? error.message : "Failed to save payment details";
                toast.error(errorMessage);
            }
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        populateForm(paymentDetails || null);
    };

    const handleModify = () => {
        setIsEditing(true);
    };

    return (
        <div className="flex flex-col w-full gap-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                                    type="button"
                                    onClick={handleCancel}
                                />
                                <Button
                                    label={isPending ? "Saving..." : "Save"}
                                    disabled={isPending || !isDirty}
                                    type="submit"
                                />
                            </>
                        ) : (
                            <Button
                                label="Modify"
                                type="button"
                                onClick={handleModify}
                            />
                        )}
                    </div>
                </div>

                <fieldset className="space-y-4 rounded-xl border border-border p-6">
                    <legend className="sr-only">Bank Account Information</legend>
                    <Input
                        id="accountHolderName"
                        label="Account Holder Name"
                        required
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("accountHolderName")}
                        errors={errors}
                        placeholder="e.g. John Doe"
                    />
                    <Input
                        id="bankName"
                        label="Bank Name"
                        required
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("bankName")}
                        errors={errors}
                        placeholder="e.g. HDFC Bank"
                    />
                    <Input
                        id="accountNumber"
                        label="Account Number"
                        required
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("accountNumber")}
                        errors={errors}
                        placeholder="Enter account number"
                    />
                    <Input
                        id="reAccountNumber"
                        label="Re-enter Account Number"
                        required
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("reAccountNumber")}
                        errors={errors}
                        placeholder="Re-enter account number"
                    />
                    <Input
                        id="ifscCode"
                        label="IFSC Code (India)"
                        required
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("ifscCode")}
                        errors={errors}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                    />
                </fieldset>

                <Heading
                    title="Tax Information"
                    subtitle="Provide your tax information."
                    variant="h4"
                />

                <fieldset className="space-y-4 rounded-xl border border-border p-6">
                    <legend className="sr-only">Tax Information</legend>
                    <Input
                        id="companyName"
                        label="Company Name (optional)"
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("companyName")}
                        errors={errors}
                        placeholder="e.g. Acme Studios Pvt Ltd"
                    />
                    <Input
                        id="gstin"
                        label="GSTIN (optional)"
                        variant="horizontal"
                        labelWidth={DEFAULT_LABEL_WIDTH}
                        size="md"
                        disabled={!isEditing || isPending}
                        register={register("gstin")}
                        errors={errors}
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        maxLength={15}
                    />
                </fieldset>
            </form>
        </div>
    );
};

export default PaymentDetails;
