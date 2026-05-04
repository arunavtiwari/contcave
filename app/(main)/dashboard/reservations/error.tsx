"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export default function ReservationsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Reservations Error]", { message: error.message, digest: error.digest });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center">
            <Heading
                title="Failed to load reservations"
                subtitle="We couldn't retrieve your reservations. Please try again."
                center
            />
            <Button label="Try Again" onClick={() => reset()} fit />
        </div>
    );
}
