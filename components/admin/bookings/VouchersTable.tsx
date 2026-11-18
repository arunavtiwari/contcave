import type { ReactNode } from "react";
import { FiEye, FiRefreshCw } from "react-icons/fi";

import type { AdminVoucherRow } from "@/app/actions/adminBookingActions";
import { CompactPill, documentDelivery, DownloadPdfButton, MutedDash, voucherTypeLabel } from "@/components/admin/bookings/shared";
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
import { formatINR, formatISTDateTime } from "@/lib/utils";

type Props = {
  rows: AdminVoucherRow[];
  footer: ReactNode;
  isLoading: boolean;
  pageSize: number;
  canManage: boolean;
  isPending: boolean;
  pendingId: string | null;
  onRetry: (voucherId: string) => void;
};

export default function VouchersTable({ rows, footer, isLoading, pageSize, canManage, isPending, pendingId, onRetry }: Props) {
  return (
    rows.length > 0 || isLoading ? (
      <Table footer={footer}>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Delivery</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={7} />
          ) : (
            rows.map((voucher) => {
              const delivery = documentDelivery(voucher);
              const retryDisabled = Boolean(voucher.emailSentAt) || (isPending && pendingId !== voucher.id);

              return (
                <TableRow key={voucher.id} className="align-top">
                  <TableCell>
                    <div className="truncate font-mono text-xs" title={voucher.voucherNumber}>{voucher.voucherNumber}</div>
                    {voucher.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{voucher.bookingId}</div> : null}
                  </TableCell>
                  <TableCell>{voucherTypeLabel(voucher.voucherType)}</TableCell>
                  <TableCell>
                    <Tooltip content={voucher.recipientName}>
                      <div className="truncate">{voucher.recipientName}</div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{voucher.issuedAt ? formatISTDateTime(voucher.issuedAt) : <MutedDash title="Document issue date unavailable" />}</TableCell>
                  <TableCell className="text-right">{formatINR(voucher.amount)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <CompactPill label={delivery.label} variant={delivery.variant} />
                      {voucher.emailError ? (
                        <Tooltip content={voucher.emailError}>
                          <span className="truncate max-w-30 text-xs text-destructive">{voucher.emailError}</span>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {voucher.voucherUrl ? (
                        <Button
                          href={voucher.voucherUrl}
                          target="_blank"
                          icon={FiEye}
                          isIconOnly
                          outline
                          aria-label="View receipt/refund PDF"
                          tooltip="View PDF"
                        />
                      ) : null}
                      {voucher.voucherUrl ? <DownloadPdfButton href={voucher.voucherUrl} label="receipt/refund" /> : null}
                      {canManage && <Button
                        icon={FiRefreshCw}
                        isIconOnly
                        outline
                        aria-label={voucher.emailSentAt ? "Receipt/refund email already sent" : "Retry receipt/refund email"}
                        tooltip={voucher.emailSentAt ? "Already sent" : "Retry email"}
                        loading={isPending && pendingId === voucher.id}
                        disabled={retryDisabled}
                        onClick={() => onRetry(voucher.id)}
                      />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    ) : <EmptyTable label="No receipts or refunds found." />
  );
}
