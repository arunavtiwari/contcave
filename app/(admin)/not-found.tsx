import type { Metadata } from "next";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export const metadata: Metadata = {
    title: "Page Not Found — Admin",
    robots: { index: false, follow: false },
};

export default function AdminNotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <p className="text-5xl font-semibold">404</p>
            <Heading
                title="Admin page not found"
                subtitle="The admin resource you're looking for doesn't exist or has been moved."
                center
            />
            <Button
                label="Back to Admin Dashboard"
                href="/admin"
                fit
            />
        </div>
    );
}
