import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "path";

import { DEFAULT_SAC_CODE } from "@/constants/gst";

Font.register({
  family: "Geist",
  fonts: [
    {
      src: path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
});

export type InvoiceDocumentType =
  | "CUSTOMER_STUDIO_TAX_INVOICE"
  | "CUSTOMER_ARKANET_TAX_INVOICE"
  | "OWNER_MONTHLY_COMMISSION_INVOICE"
  | "OWNER_MONTHLY_BILL_OF_SUPPLY";

export type InvoiceParty = {
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  label?: string;
};

export type InvoiceLineItem = {
  description: string;
  subText?: string | null;
  sac?: string | null;
  quantity?: string | number | null;
  rate?: number | null;
  taxableValue: number;
  cgstRate?: number | null;
  cgstAmount?: number | null;
  sgstRate?: number | null;
  sgstAmount?: number | null;
  igstRate?: number | null;
  igstAmount?: number | null;
};

export type InvoiceTaxBreakup = {
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
};

export type InvoicePDFData = {
  documentType: InvoiceDocumentType;
  invoiceNumber: string;
  invoiceDate: Date;
  placeOfSupply?: string | null;
  billingPeriod?: string | null;
  paymentMode?: string | null;
  bookingId?: string | null;
  studioName?: string | null;
  bookingDate?: Date | null;
  durationLabel?: string | null;
  billedBy: InvoiceParty;
  billedTo: InvoiceParty;
  lineItems: InvoiceLineItem[];
  amount: number;
  gstAmount?: number | null;
  taxBreakup?: InvoiceTaxBreakup | null;
  totalAmount: number;
  notes: string[];
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Geist",
    backgroundColor: "#ffffff",
    color: "#222222",
    paddingBottom: 32,
  },
  header: {
    backgroundColor: "#0f0e0c",
    color: "#ffffff",
    paddingHorizontal: 28,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandBox: {
    width: "56%",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 1.08,
  },
  brandSub: {
    color: "#c8a96e",
    fontSize: 7,
    letterSpacing: 2,
    marginTop: 3,
  },
  docBox: {
    alignItems: "flex-end",
    width: "40%",
  },
  docLabel: {
    color: "#c8a96e",
    fontSize: 7,
    letterSpacing: 2,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 3,
    textAlign: "right",
  },
  docMeta: {
    color: "#aaaaaa",
    fontSize: 8,
    lineHeight: 1.35,
    marginTop: 5,
    textAlign: "right",
  },
  section: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  sectionTitle: {
    color: "#777777",
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  half: {
    width: "48%",
  },
  thirds: {
    flexDirection: "row",
    gap: 20,
  },
  metaItem: {
    width: "32%",
  },
  label: {
    color: "#777777",
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  value: {
    color: "#111111",
    fontSize: 9,
    lineHeight: 1.28,
  },
  valueBold: {
    color: "#111111",
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 1.28,
  },
  muted: {
    color: "#666666",
    fontSize: 8,
    lineHeight: 1.25,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    paddingBottom: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingVertical: 7,
  },
  th: {
    color: "#777777",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  td: {
    fontSize: 9,
    lineHeight: 1.25,
  },
  colDesc: { width: "42%" },
  colSac: { width: "14%" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colAmount: { width: "16%", textAlign: "right" },
  totalsWrap: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  totals: {
    width: 260,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grand: {
    borderTopWidth: 2,
    borderTopColor: "#111111",
    marginTop: 4,
    paddingTop: 5,
  },
  grandText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  notes: {
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  noteText: {
    color: "#555555",
    fontSize: 7.5,
    lineHeight: 1.22,
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0f0e0c",
    color: "#aaaaaa",
    paddingHorizontal: 28,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
  },
});

function money(value: number | null | undefined) {
  return `Rs. ${(Number(value || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value: Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function longDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function numberToWordsINR(num: number): string {
  const rounded = Math.round(num);
  if (rounded === 0) return "Zero";

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return `${units[n]} `;
    if (n < 100) return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim() + " ";
    return `${units[Math.floor(n / 100)]} Hundred ${convert(n % 100)}`;
  };

  let result = "";
  let temp = rounded;
  if (temp >= 10000000) {
    result += `${convert(Math.floor(temp / 10000000))}Crore `;
    temp %= 10000000;
  }
  if (temp >= 100000) {
    result += `${convert(Math.floor(temp / 100000))}Lakh `;
    temp %= 100000;
  }
  if (temp >= 1000) {
    result += `${convert(Math.floor(temp / 1000))}Thousand `;
    temp %= 1000;
  }
  result += convert(temp);
  return result.trim();
}

function documentTitle(documentType: InvoiceDocumentType) {
  if (documentType === "OWNER_MONTHLY_BILL_OF_SUPPLY") return "BILL OF SUPPLY";
  return "TAX INVOICE";
}

function documentTypeMeta(documentType: InvoiceDocumentType) {
  if (documentType === "OWNER_MONTHLY_COMMISSION_INVOICE") return "COMMISSION INVOICE";
  if (documentType === "OWNER_MONTHLY_BILL_OF_SUPPLY") return "BILL OF SUPPLY";
  return documentType.replace(/_/g, " ");
}

function partyBlock(title: string, party: InvoiceParty) {
  return (
    <View style={styles.half}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.valueBold}>{party.legalName || party.name}</Text>
      {party.label ? <Text style={styles.muted}>{party.label}</Text> : null}
      {party.address ? <Text style={styles.value}>{party.address}</Text> : null}
      {party.phone ? <Text style={styles.value}>Phone: {party.phone}</Text> : null}
      {party.email ? <Text style={styles.value}>Email: {party.email}</Text> : null}
      {party.gstin ? <Text style={styles.valueBold}>GSTIN: {party.gstin}</Text> : null}
      {party.pan && !party.gstin ? <Text style={styles.value}>PAN: {party.pan}</Text> : null}
    </View>
  );
}

const InvoiceDocument = (data: InvoicePDFData) => {
  const tax = data.taxBreakup || {
    taxableValue: data.amount,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalTax: data.gstAmount || 0,
  };
  const showTax = tax.totalTax > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBox}>
            <Text style={styles.brandName}>{data.billedBy.name}</Text>
            <Text style={styles.brandSub}>
              {data.documentType === "CUSTOMER_STUDIO_TAX_INVOICE" ? "STUDIO PARTNER VIA CONTCAVE" : "CONTCAVE BILLING"}
            </Text>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docLabel}>DOCUMENT</Text>
            <Text style={styles.docTitle}>{documentTitle(data.documentType)}</Text>
            <Text style={styles.docMeta}>
              No: {data.invoiceNumber}
              {"\n"}Date: {longDate(data.invoiceDate)}
              {data.placeOfSupply ? `\nPlace of Supply: ${data.placeOfSupply}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.thirds}>
            <View style={styles.metaItem}>
              <Text style={styles.label}>{data.billingPeriod ? "Billing Period" : "Payment Mode"}</Text>
              <Text style={styles.valueBold}>{data.billingPeriod || data.paymentMode || "Online"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.label}>SAC Code</Text>
              <Text style={styles.valueBold}>{DEFAULT_SAC_CODE}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.label}>{data.bookingId ? "Booking ID" : "Document Type"}</Text>
              <Text style={styles.valueBold}>{data.bookingId || documentTypeMeta(data.documentType)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.row]}>
          {partyBlock("Billed By", data.billedBy)}
          {partyBlock("Billed To", data.billedTo)}
        </View>

        {(data.studioName || data.bookingDate || data.durationLabel) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.thirds}>
              <View style={styles.metaItem}>
                <Text style={styles.label}>Studio</Text>
                <Text style={styles.valueBold}>{data.studioName || "-"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.label}>Booking Date</Text>
                <Text style={styles.valueBold}>{shortDate(data.bookingDate) || "-"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.label}>Duration</Text>
                <Text style={styles.valueBold}>{data.durationLabel || "-"}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colSac]}>SAC</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount]}>Taxable Value</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.td}>{item.description}</Text>
                {item.subText ? <Text style={styles.muted}>{item.subText}</Text> : null}
              </View>
              <Text style={[styles.td, styles.colSac]}>{item.sac || DEFAULT_SAC_CODE}</Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity ?? "-"}</Text>
              <Text style={[styles.td, styles.colRate]}>{item.rate != null ? money(item.rate) : "-"}</Text>
              <Text style={[styles.td, styles.colAmount]}>{money(item.taxableValue)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap} wrap={false}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.value}>Taxable Amount</Text>
              <Text style={styles.value}>{money(data.amount)}</Text>
            </View>
            {showTax ? (
              <>
                {tax.igstAmount > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.muted}>IGST @ {(tax.igstRate * 100).toFixed(0)}%</Text>
                    <Text style={styles.muted}>{money(tax.igstAmount)}</Text>
                  </View>
                ) : null}
                {tax.cgstAmount > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.muted}>CGST @ {(tax.cgstRate * 100).toFixed(0)}%</Text>
                    <Text style={styles.muted}>{money(tax.cgstAmount)}</Text>
                  </View>
                ) : null}
                {tax.sgstAmount > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.muted}>SGST @ {(tax.sgstRate * 100).toFixed(0)}%</Text>
                    <Text style={styles.muted}>{money(tax.sgstAmount)}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>GST</Text>
                <Text style={styles.muted}>Not applicable</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grand]}>
              <Text style={styles.grandText}>Total</Text>
              <Text style={styles.grandText}>{money(data.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.valueBold}>Amount in Words</Text>
          <Text style={styles.value}>Rupees {numberToWordsINR(data.totalAmount)} Only</Text>
        </View>

        <View style={styles.notes} wrap={false}>
          <Text style={styles.sectionTitle}>Terms and Notes</Text>
          {data.notes.map((note, index) => (
            <Text key={`${note}-${index}`} style={styles.noteText}>{index + 1}. {note}</Text>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated via ContCave</Text>
          <Text style={styles.footerText}>contcave.com</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateInvoicePDFBlob(data: InvoicePDFData): Promise<Blob> {
  const forbidden = /\b(TDS|194C|194H|Form 16A)\b/i;
  const searchableText = JSON.stringify(data);
  if (forbidden.test(searchableText)) {
    throw new Error("Invoice templates must not contain TDS references");
  }

  const buffer = await renderToBuffer(<InvoiceDocument {...data} />);
  return new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
}
