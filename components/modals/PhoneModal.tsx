import Modal from "./Modal";

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
    const bodyContent = (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
                Please provide a valid mobile number to continue with your booking.
            </p>
            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Mobile number
                </label>
                <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-muted border border-border rounded-xl text-muted-foreground font-medium text-sm">
                        +91
                    </span>
                    <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        className="flex-1 rounded-xl border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-foreground/10 transition-shadow text-sm"
                        placeholder="10-digit number"
                        value={phoneInput}
                        onChange={(e) => {
                            setPhoneErrorAction(null);
                            setPhoneInputAction(e.target.value.replace(/\D/g, "").slice(0, 10));
                        }}
                        disabled={phoneSaving}
                    />
                </div>
                {!!phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            onSubmitAction={onSubmitAction}
            title="Add your mobile number"
            body={bodyContent}
            actionLabel={phoneSaving ? "Saving..." : "Save & Continue"}
            secondaryActionLabel="Cancel"
            secondaryActionAction={onCloseAction}
            disabled={phoneSaving}
            isLoading={phoneSaving}
            customWidth="w-full max-w-md"
            customHeight="h-fit"
        />
    );
}


