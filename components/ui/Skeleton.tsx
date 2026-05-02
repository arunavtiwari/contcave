import React from "react";

import { cn } from "@/lib/utils";

export default function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse bg-foreground/3 rounded-xl", className)}
            {...props}
        />
    );
}
