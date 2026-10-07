import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type KbdProps = { children: ReactNode; className?: string };

export default function Kbd({ children, className }: KbdProps) {
    return (
        <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-background px-1.5 font-sans text-[11px] font-medium text-foreground/70 shadow-[0_1px_0_var(--color-border)]", className)}>
            {children}
        </kbd>
    );
}
