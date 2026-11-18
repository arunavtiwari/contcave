import type { ReactNode } from "react";
import { FiEye, FiRefreshCw } from "react-icons/fi";

import type { AdminInvoiceRow } from "@/app/actions/adminBookingActions";
import { CompactPill, documentDelivery, DownloadPdfButton, MutedDash } from "@/components/admin/bookings/shared";
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

function invoiceTypeLabel(value: AdminInvoiceRow["documentType"]) {
  return value
    .replace("CUSTOMER_STUDIO_TAX_INVOICE", "Customer - Studio Tax")
    .replace("CUSTOMER_ARKANET_TAX_INVOICE", "Customer - Arkanet Tax")
    .replace("OWNER_MONTHLY_COMMISSION_INVOICE", "Owner - Commission")
    .replace("OWNER_MONTHLY_BILL_OF_SUPPLY", "Owner - Bill of Supply")
    .replace(/_/g, " ");
}

type Props = {
  rows: AdminInvoiceRow[];
  footer: ReactNode;
  isLoading: boolean;
  pageSize: number;
  canManage: boolean;
  isPending: boolean;
  pendingId: string | null;
  onRetry: (invoiceId: string) => void;
};

export default function InvoicesTable({ rows, footer, isLoading, pageSize, canManage, isPending, pendingId, onRetry }: Props) {
  return (
    rows.length > 0 || isLoading ? (
      <Table footer={footer}>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Delivery</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={7} />
          ) : (
            rows.map((invoice) => {
              const delivery = documentDelivery(invoice);
              const retryDisabled = Boolean(invoice.emailSentAt) || (isPending && pendingId !== invoice.id);

              return (
                <TableRow key={invoice.id} className="align-top">
                  <TableCell>
                    <div className="truncate font-mono text-xs" title={invoice.invoiceNumber}>{invoice.invoiceNumber}</div>
                    {invoice.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{invoice.bookingId}</div> : null}
                  </TableCell>
                  <TableCell>{invoiceTypeLabel(invoice.documentType)}</TableCell>
                  <TableCell>
                    <Tooltip content={invoice.recipientName}>
                      <div className="truncate">{invoice.recipientName}</div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{invoice.issuedAt ? formatISTDateTime(invoice.issuedAt) : <MutedDash title="Invoice issue date unavailable" />}</TableCell>
                  <TableCell className="text-right">{formatINR(invoice.totalAmount)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <CompactPill label={delivery.label} variant={delivery.variant} />
                      {invoice.emailError ? (
                        <Tooltip content={invoice.emailError}>
                          <span className="truncate max-w-30 text-xs text-destructive">{invoice.emailError}</span>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.invoiceUrl ? (
                        <Button
                          href={invoice.invoiceUrl}
                          target="_blank"
                          icon={FiEye}
                          isIconOnly
                          outline
                          aria-label="View invoice PDF"
                          tooltip="View PDF"
                        />
                      ) : null}
                      {invoice.invoiceUrl ? <DownloadPdfButton href={invoice.invoiceUrl} label="invoice" /> : null}
                      {canManage && <Button
                        icon={FiRefreshCw}
                        isIconOnly
                        outline
                        aria-label={invoice.emailSentAt ? "Invoice email already sent" : "Retry invoice email"}
                        tooltip={invoice.emailSentAt ? "Already sent" : "Retry email"}
                        loading={isPending && pendingId === invoice.id}
                        disabled={retryDisabled}
                        onClick={() => onRetry(invoice.id)}
                      />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    ) : <EmptyTable label="No invoices found for this view." />
  );
}
