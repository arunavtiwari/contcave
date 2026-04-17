"use client";

import React, { useEffect } from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Admin Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <Heading
                title="Admin System Error"
                subtitle="An unexpected error occurred while processing this management route."
                center
            />
            <div className="w-48">
                <Button
                    label="Try Again"
                    onClick={() => reset()}
                />
            </div>
        </div>
    );
}
