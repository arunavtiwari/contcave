import Input from "@/components/inputs/Input";
import Modal from "@/components/modals/Modal";

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
                    <Input
                        id="phone-modal-input"
                        placeholder="10-digit number"
                        value={phoneInput}
                        type="number"
                        autoFocus
                        onNumberChange={(val) => {
                            setPhoneErrorAction(null);
                            setPhoneInputAction(val.toString().slice(0, 10));
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


