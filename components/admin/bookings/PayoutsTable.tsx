import type { ReactNode } from "react";

import type { AdminPayoutRow } from "@/app/actions/adminBookingActions";
import { CompactPill, MutedDash } from "@/components/admin/bookings/shared";
import Button from "@/components/ui/Button";
import {
  EmptyTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import Tooltip from "@/components/ui/Tooltip";
import { formatINR } from "@/lib/utils";

type Props = {
  rows: AdminPayoutRow[];
  footer: ReactNode;
  isLoading: boolean;
  pageSize: number;
  canManage: boolean;
  onMarkPaid: (payout: AdminPayoutRow) => void;
};

export default function PayoutsTable({ rows, footer, isLoading, pageSize, canManage, onMarkPaid }: Props) {
  return (
    rows.length > 0 || isLoading ? (
      <Table footer={footer}>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Payout</TableHead>
            <TableHead className="text-center">Split</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={6} />
          ) : (
            rows.map((payout) => (
              <TableRow key={payout.id} className="align-top">
                <TableCell className="font-mono text-xs">{payout.bookingId || payout.id}</TableCell>
                <TableCell>
                  <Tooltip content={payout.ownerName}>
                    <div className="truncate">{payout.ownerName}</div>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip content={payout.studioName}>
                    <div className="truncate">{payout.studioName}</div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-xs">{payout.vendorConfigured ? "Configured" : <MutedDash title="Vendor is not configured" />}</TableCell>
                <TableCell className="text-right">{formatINR(payout.payoutAmount || 0)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <CompactPill label={payout.payoutDoneAt ? "Done" : payout.payoutSplitAt ? "Split" : "Pending"} variant={payout.payoutDoneAt ? "success" : "warning"} />
                    {canManage && !payout.payoutDoneAt && !payout.payoutSplitAt && payout.status === "SUCCESS" && (
                      <Button variant="link" size="sm" className="text-xs" onClick={() => onMarkPaid(payout)} label="Mark paid" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    ) : <EmptyTable label="No payouts found." />
  );
}
