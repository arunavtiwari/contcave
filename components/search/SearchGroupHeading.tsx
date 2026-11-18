import type { ReactNode } from "react";

type SearchGroupHeadingProps = { id: string; label: string; action?: ReactNode };

export default function SearchGroupHeading({ id, label, action }: SearchGroupHeadingProps) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 pb-1.5 pt-3">
            <span id={id} className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                {label}
            </span>
            {action}
        </div>
    );
}
