import React from "react";

import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
    badge: string;
    title: React.ReactNode;
    description?: string;
    center?: boolean;
    className?: string;
    badgeClassName?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    badge,
    title,
    description,
    center = false,
    className = "",
    badgeClassName = "",
}) => {
    return (
        <div
            className={cn("mb-8", center ? "text-center" : "text-start", className)}
        >
            <p
                className={cn(
                    "mb-3 text-[10px] font-bold uppercase tracking-widest text-foreground/80",
                    center ? "mx-auto" : "",
                    badgeClassName
                )}
            >
                {badge}
            </p>

            <Heading
                title={title}
                variant="h2"
                center={center}
            />

            {description && (
                <p className={cn(
                    "mt-4 text-muted-foreground leading-relaxed",
                    center ? "mx-auto md:w-4/5 lg:w-3/5" : "max-w-2xl"
                )}>
                    {description}
                </p>
            )}
        </div>
    );
};

export default SectionHeader;
