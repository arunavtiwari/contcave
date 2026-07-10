import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

export type VoucherPdfData = {
  voucherNumber: string;
  voucherType: "RECEIPT_VOUCHER" | "REFUND_VOUCHER";
  issuedAt: Date;
  bookingId?: string | null;
  customerName: string;
  studioName: string;
  bookingDate: Date;
  bookingTime: string;
  paymentRef?: string | null;
  amount: number;
  note?: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#e8e4dc",
    color: "#222222",
    fontFamily: "Helvetica",
  },
  shell: {
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 30,
    backgroundColor: "#0f0e0c",
    color: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 28,
    fontFamily: "Times-Roman",
  },
  sub: {
    marginTop: 4,
    color: "#c8a96e",
    fontSize: 9,
    letterSpacing: 2,
  },
  label: {
    color: "#c8a96e",
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "right",
  },
  docType: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: 700,
    textAlign: "right",
  },
  docMeta: {
    marginTop: 8,
    color: "#d1d5db",
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: "right",
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  smallTitle: {
    color: "#888888",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  customer: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: 700,
    color: "#0f0e0c",
  },
  details: {
    flexDirection: "row",
    gap: 18,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    color: "#999999",
    fontSize: 10,
    marginBottom: 4,
  },
  detailValue: {
    color: "#0f0e0c",
    fontSize: 11,
    lineHeight: 1.4,
  },
  amountBand: {
    padding: 24,
    backgroundColor: "#f6f2ea",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    color: "#777777",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  amountValue: {
    color: "#0f0e0c",
    fontSize: 24,
    fontWeight: 700,
  },
  note: {
    padding: 20,
    color: "#555555",
    fontSize: 11,
    lineHeight: 1.6,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  footer: {
    padding: 14,
    backgroundColor: "#0f0e0c",
    color: "#999999",
    fontSize: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerName: {
    color: "#c8a96e",
  },
});

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function formatInr(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function titleFor(type: VoucherPdfData["voucherType"]) {
  return type === "REFUND_VOUCHER" ? "REFUND VOUCHER" : "PAYMENT RECEIPT";
}

function amountLabelFor(type: VoucherPdfData["voucherType"]) {
  return type === "REFUND_VOUCHER" ? "Amount Refunded" : "Amount Received";
}

function defaultNote(type: VoucherPdfData["voucherType"]) {
  if (type === "REFUND_VOUCHER") {
    return "This is a refund voucher, not a tax invoice. The customer tax invoice is not issued for an unconfirmed booking request.";
  }
  return "This is a payment receipt, not a tax invoice. A tax invoice will be issued once the studio confirms your booking. If it is not confirmed, the full amount is refunded to your original payment method.";
}

function VoucherDocument(data: VoucherPdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>ContCave</Text>
              <Text style={styles.sub}>BY ARKANET VENTURES LLP</Text>
            </View>
            <View>
              <Text style={styles.label}>DOCUMENT</Text>
              <Text style={styles.docType}>{titleFor(data.voucherType)}</Text>
              <Text style={styles.docMeta}>
                No: {data.voucherNumber}
                {"\n"}Date: {formatDate(data.issuedAt)}
                {data.bookingId ? `\nBooking ID: ${data.bookingId}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.smallTitle}>{data.voucherType === "REFUND_VOUCHER" ? "Refunded To" : "Received From"}</Text>
            <Text style={styles.customer}>{data.customerName}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.details}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Studio</Text>
                <Text style={styles.detailValue}>{data.studioName}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booking</Text>
                <Text style={styles.detailValue}>{formatDate(data.bookingDate)}, {data.bookingTime}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Ref</Text>
                <Text style={styles.detailValue}>{data.paymentRef || "N/A"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.amountBand}>
            <Text style={styles.amountLabel}>{amountLabelFor(data.voucherType)}</Text>
            <View>
              <Text style={styles.amountValue}>{formatInr(data.amount)}</Text>
            </View>
          </View>

          <Text style={styles.note}>{data.note || defaultNote(data.voucherType)}</Text>

          <View style={styles.footer}>
            <Text>ContCave | contcave.com</Text>
            <Text style={styles.footerName}>Arkanet Ventures LLP</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateVoucherPDFBuffer(data: VoucherPdfData): Promise<Buffer> {
  return await renderToBuffer(<VoucherDocument {...data} />);
}
