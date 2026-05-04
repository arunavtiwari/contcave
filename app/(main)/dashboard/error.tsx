"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Dashboard Error]", {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
            <Heading
                title="Something went wrong"
                subtitle="We encountered an unexpected error. Please try again."
                center
            />
            <div className="flex gap-3">
                <Button
                    label="Try Again"
                    onClick={() => reset()}
                    fit
                />
                <Button
                    label="Go Home"
                    href="/"
                    variant="outline"
                    fit
                />
            </div>
        </div>
    );
}
