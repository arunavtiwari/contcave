"use client";

import { useEffect } from "react";

import EmptyState from "@/components/EmptyState";

type Props = {
    error: Error;
};

function ErrorState({ error }: Props) {
    useEffect(() => {
        const isProduction = process.env.NODE_ENV === "production";

        if (isProduction) {
            console.error("[Error Boundary]", {
                message: error.message,
                stack: error.stack,
                name: error.name,
            });
        } else {
            console.error("🚀 Error boundary caught an error:", error);
        }
    }, [error]);

    return <EmptyState title="Uh Oh" subtitle="Something went wrong!" />;
}

export default ErrorState;
