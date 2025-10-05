"use client";

import { useId } from "react";

type PhoneModalProps = {
    isOpen: boolean;
    phoneInput: string;
    phoneError: string | null;
    phoneSaving: boolean;
    setPhoneInput: (v: string) => void;
    setPhoneError: (v: string | null) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export default function PhoneModal({
    isOpen,
    phoneInput,
    phoneError,
    phoneSaving,
    setPhoneInput,
    setPhoneError,
    onClose,
    onSubmit,
}: PhoneModalProps) {
    const sectionId = useId();
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${sectionId}-phone-title`}
            onClick={() => !phoneSaving && onClose()}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id={`${sectionId}-phone-title`} className="text-lg font-semibold mb-2">
                    Add your mobile number
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                    Please provide a valid mobile number to continue with your booking.
                </p>
                <div className="space-y-2">
                    <label htmlFor={`${sectionId}-phone-input`} className="text-sm">
                        Mobile number
                    </label>
                    <input
                        id={`${sectionId}-phone-input`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                        placeholder="10-digit number"
                        value={phoneInput}
                        onChange={(e) => {
                            setPhoneError(null);
                            setPhoneInput(e.target.value);
                        }}
                        disabled={phoneSaving}
                    />
                    {!!phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                </div>
                <div className="mt-5 flex gap-2 justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                        onClick={() => !phoneSaving && onClose()}
                        disabled={phoneSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 rounded-lg text-white ${phoneSaving ? "bg-neutral-500" : "bg-black hover:opacity-90"}`}
                        onClick={onSubmit}
                        disabled={phoneSaving}
                    >
                        {phoneSaving ? "Saving…" : "Save & Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
}
