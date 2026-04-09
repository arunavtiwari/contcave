"use client";

import { useState, useEffect } from "react";
import { IoWarningOutline } from "react-icons/io5";

import Modal from "./Modal";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    propertyName: string;
    isLoading: boolean;
};

export default function DeletePropertyModal({
    isOpen,
    onClose,
    onConfirm,
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
            <div className="flex items-start gap-4 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <IoWarningOutline size={28} className="shrink-0 mt-0.5 text-red-600" />
                <div>
                    <h4 className="font-bold text-[15px] mb-1">Irreversible Action</h4>
                    <p className="text-sm leading-relaxed text-red-600/90 text-justify">
                        Deleting this property will permanently remove all associated data,
                        including settings, blocks, and media. This action cannot be undone.
                    </p>
                </div>
            </div>
            <div className="mt-2">
                <label className="text-[13px] font-semibold text-gray-700 block mb-2 uppercase tracking-wide">
                    To verify, type the property name:
                </label>
                <div className="font-mono text-sm block text-black p-3 mb-3 bg-gray-50 rounded-lg select-all border border-gray-200">
                    {propertyName}
                </div>
                <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 transition outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="Enter property name..."
                    disabled={isLoading}
                />
            </div>
        </div>
    );

    const footerContent = (
        <div className="flex gap-3 w-full">
            <button
                onClick={onClose}
                disabled={isLoading}
                className="w-1/2 py-3 px-4 rounded-xl border border-neutral-300 bg-white text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 font-medium text-sm"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={!isMatch || isLoading}
                className="w-1/2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
            >
                {isLoading ? "Deleting..." : "Delete Property"}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onConfirm}
            title="Delete Property"
            body={bodyContent}
            footer={footerContent}
            selfActionButton
            actionLabel=""
            disabled={isLoading}
            customWidth="w-full md:w-[480px]"
            customHeight="h-fit"
        />
    );
}
