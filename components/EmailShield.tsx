"use client";

import React, { useEffect,useState } from "react";

import { cn } from "@/lib/utils";

interface EmailShieldProps {
    email: string;
    className?: string;
    children?: React.ReactNode;
    showIcon?: boolean;
}

const EmailShield: React.FC<EmailShieldProps> = ({
    email,
    className,
    children,
}) => {
    const [mounted, setMounted] = useState(false);
    const encodedEmail = email.split("").reverse().join("");

    useEffect(() => {
        setMounted(true);
    }, []);

    const decodeEmail = (encoded: string) => {
        return encoded.split("").reverse().join("");
    };

    const handleAction = (e: React.MouseEvent) => {
        if (!mounted) {
            e.preventDefault();
            return;
        }

        const decoded = decodeEmail(encodedEmail);
        window.location.href = `mailto:${decoded}`;
    };

    return (
        <a
            href={mounted ? `mailto:${email}` : "#"}
            onClick={handleAction}
            className={cn(
                "cursor-pointer transition-colors hover:text-primary",
                className
            )}
            title={mounted ? "Click to send an email" : "Protecting email..."}
        >
            {children || (mounted ? email : email.replace("@", " [at] ").replace(/\./g, " [dot] "))}
        </a>
    );
};

export default EmailShield;
