import type { ReactNode } from "react";
import { FiFileText } from "react-icons/fi";

import type { AdminAuditRow } from "@/app/actions/adminBookingActions";
import Skeleton from "@/components/ui/Skeleton";
import { EmptyTable } from "@/components/ui/Table";
import { formatISTDateTime } from "@/lib/utils";

type Props = {
  rows: AdminAuditRow[];
  footer: ReactNode;
  isLoading: boolean;
  pageSize: number;
};

export default function AuditTable({ rows, footer, isLoading, pageSize }: Props) {
  return (
    rows.length > 0 || isLoading ? (
      <div className="space-y-4">
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                </div>
              </div>
            ))
          ) : (
            rows.map((audit) => (
              <div key={audit.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-neutral-50">
                  <FiFileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{audit.action}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatISTDateTime(audit.createdAt)} | {audit.resourceId || "No resource"}</div>
                  {audit.metadata ? <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted p-2 text-xs">{JSON.stringify(audit.metadata, null, 2)}</pre> : null}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {footer}
        </div>
      </div>
    ) : <EmptyTable label="No document audit events found." />
  );
}
