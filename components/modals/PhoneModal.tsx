"use client";

import { useId } from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

type PhoneModalProps = {
    isOpen: boolean;
    phoneInput: string;
    phoneError: string | null;
    phoneSaving: boolean;
    setPhoneInputAction: (v: string) => void;
    setPhoneErrorAction: (v: string | null) => void;
    onCloseAction: () => void;
    onSubmitAction: () => void;
};

export default function PhoneModal({
    isOpen,
    phoneInput,
    phoneError,
    phoneSaving,
    setPhoneInputAction,
    setPhoneErrorAction,
    onCloseAction,
    onSubmitAction,
}: PhoneModalProps) {
    const sectionId = useId();
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-foreground/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${sectionId}-phone-title`}
            onClick={() => !phoneSaving && onCloseAction()}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-background  p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <Heading
                    title="Add your mobile number"
                    variant="h5"
                    id={`${sectionId}-phone-title`}
                    className="mb-2"
                />
                <p className="text-sm text-muted-foreground mb-4">
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
                        className="w-full rounded-xl border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-foreground/10 transition-shadow"
                        placeholder="10-digit number"
                        value={phoneInput}
                        onChange={(e) => {
                            setPhoneErrorAction(null);
                            setPhoneInputAction(e.target.value);
                        }}
                        disabled={phoneSaving}
                    />
                    {!!phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
                </div>
                <div className="mt-8 flex gap-3 justify-end">
                    <Button
                        label="Cancel"
                        variant="outline"
                        onClick={onCloseAction}
                        disabled={phoneSaving}
                        rounded
                    />
                    <Button
                        label={phoneSaving ? "Savingâ€¦" : "Save & Continue"}
                        onClick={onSubmitAction}
                        loading={phoneSaving}
                        rounded
                    />
                </div>
            </div>
        </div>
    );
}


