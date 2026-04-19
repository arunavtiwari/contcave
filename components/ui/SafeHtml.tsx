"use client";

import DOMPurify from "isomorphic-dompurify";
import React from "react";

import { cn } from "@/lib/utils";

interface SafeHtmlProps {
    html: string;
    className?: string;
    sanitize?: boolean;
}

/**
 * A reusable component for safely rendering HTML content with consistent typography.
 */
const SafeHtml: React.FC<SafeHtmlProps> = ({
    html,
    className,
    sanitize = true
}) => {
    const cleanHtml = React.useMemo(() => {
        return sanitize ? DOMPurify.sanitize(html) : html;
    }, [html, sanitize]);

    if (!html) return null;

    return (
        <div
            className={cn(
                "prose max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-strong:text-foreground prose-headings:text-foreground",
                className
            )}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
};

export default SafeHtml;
