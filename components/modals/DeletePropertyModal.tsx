"use client";

import { useEffect, useState } from "react";
import { IoWarningOutline } from "react-icons/io5";

import Modal from "./Modal";

type Props = {
    isOpen: boolean;
    onCloseAction: () => void;
    onConfirmAction: () => void;
    propertyName: string;
    isLoading: boolean;
};

export default function DeletePropertyModal({
    isOpen,
    onCloseAction,
    onConfirmAction,
    propertyName,
    isLoading,
}: Props) {
    const [confirmName, setConfirmName] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setConfirmName("");
        }
    }, [isOpen]);

    const isMatch = confirmName === propertyName;

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4 text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20 ">
                <IoWarningOutline size={28} className="shrink-0 mt-0.5 text-destructive" />
                <div>
                    <h4 className="font-bold text-[15px] mb-1">Irreversible Action</h4>
                    <p className="text-sm leading-relaxed text-destructive/90 text-justify">
                        Deleting this property will permanently remove all associated data,
                        including settings, blocks, and media. This action cannot be undone.
                    </p>
                </div>
            </div>
            <div className="mt-2">
                <label className="text-[13px] font-semibold text-muted-foreground block mb-2 uppercase tracking-wide">
                    To verify, type the property name:
                </label>
                <div className="font-mono text-sm block text-foreground p-3 mb-3 bg-muted rounded-xl select-all border border-border">
                    {propertyName}
                </div>
                <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition outline-none focus:border-destructive focus:ring-1 focus:ring-destructive/20"
                    placeholder="Enter property name..."
                    disabled={isLoading}
                />
            </div>
        </div>
    );


    return (
        <Modal
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            onSubmitAction={onConfirmAction}
            title="Delete Property"
            body={bodyContent}
            actionLabel={isLoading ? "Deleting..." : "Delete Property"}
            secondaryActionLabel="Cancel"
            secondaryActionAction={onCloseAction}
            primaryActionVariant="destructive"
            actionDisabled={!isMatch}
            disabled={isLoading}
            customWidth="w-full md:w-[480px]"
            customHeight="h-fit"
            isLoading={isLoading}
        />
    );
}
