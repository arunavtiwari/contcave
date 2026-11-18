import type { ReactNode } from "react";

/**
 * One row for an admin table's view tabs and its filters: side by side on wide screens, stacked
 * on narrow ones, so every admin page lines them up the same way.
 */
export default function AdminFilterBar({ tabs, children }: { tabs?: ReactNode; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            {tabs}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">{children}</div>
        </div>
    );
}
