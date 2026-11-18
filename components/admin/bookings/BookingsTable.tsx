import type { ReactNode } from "react";
import { FiExternalLink, FiFileText } from "react-icons/fi";

import type { AdminBookingRow } from "@/app/actions/adminBookingActions";
import { bookingStatus, CompactPill, DownloadPdfButton } from "@/components/admin/bookings/shared";
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
import { formatINR, formatISTDate } from "@/lib/utils";

type Props = {
  rows: AdminBookingRow[];
  footer: ReactNode;
  isLoading: boolean;
  pageSize: number;
  onOpenDetail: (booking: AdminBookingRow) => void;
};

export default function BookingsTable({ rows, footer, isLoading, pageSize, onOpenDetail }: Props) {
  return (
    rows.length > 0 || isLoading ? (
      <Table footer={footer}>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={8} />
          ) : (
            rows.map((booking) => {
              const status = bookingStatus(booking);

              return (
                <TableRow key={booking.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                    {booking.bookingId}
                  </TableCell>
                  <TableCell className="max-w-50">
                    <Tooltip content={booking.studioName}>
                      <div className="truncate font-medium text-foreground">{booking.studioName}</div>
                    </Tooltip>
                    <div className="truncate text-xs text-muted-foreground">{booking.studioLocation}</div>
                  </TableCell>
                  <TableCell className="max-w-40">
                    <Tooltip content={booking.customerName}>
                      <div className="truncate font-medium text-foreground">{booking.customerName}</div>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="max-w-40">
                    <Tooltip content={booking.ownerName}>
                      <div className="truncate text-muted-foreground">{booking.ownerName}</div>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-xs font-medium text-foreground">{formatISTDate(booking.startDate)}</div>
                    <div className="text-xs text-muted-foreground">{booking.startTime} - {booking.endTime}</div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium text-foreground">
                    {formatINR(booking.amount)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <CompactPill label={status.label} variant={status.variant} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {booking.customerInvoiceUrl ? (
                        <Button
                          href={booking.customerInvoiceUrl}
                          target="_blank"
                          icon={FiFileText}
                          isIconOnly
                          outline
                          aria-label="View customer invoice"
                          tooltip={
                            booking.customerInvoiceNumber
                              ? `Invoice: ${booking.customerInvoiceNumber}`
                              : "View invoice PDF"
                          }
                        />
                      ) : null}
                      {booking.customerInvoiceUrl ? <DownloadPdfButton href={booking.customerInvoiceUrl} label="customer invoice" /> : null}
                      <Button
                        icon={FiExternalLink}
                        isIconOnly
                        outline
                        aria-label="View booking details"
                        tooltip="View details"
                        onClick={() => onOpenDetail(booking)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    ) : <EmptyTable label="No bookings found." />
  );
}
