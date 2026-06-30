import React from "react";

import { cn } from "@/lib/utils";

export default function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-shimmer bg-foreground/5 rounded-xl", className)}
            {...props}
        />
    );
}
