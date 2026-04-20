import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import path from "path";

import { ARKANET_VENTURES_GST, DEFAULT_SAC_CODE, GST_RATE } from "@/constants/gst";

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

type OwnerPaymentDetails = {
  ownerName?: string | null;
  companyName: string;
  gstin: string;
};

type InvoiceUser = {
  id: string;
  name: string | null;
  email: string | null;
  billingDetails?: BillingDetails[];
};

type BillingDetails = {
  id: string;
  companyName: string | null;
  gstin: string | null;
  isDefault: boolean;
};

type InvoiceData = {
  invoiceNumber: string;
  user: InvoiceUser;
  billing: BillingDetails | null;
  ownerPayment?: OwnerPaymentDetails | null;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  reservationId: string;
  bookingId?: string;
};

function numberToWordsINR(num: number): string {
  if (num === 0) return "Zero";
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return units[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + units[n % 10] + (n % 10 !== 0 ? " " : "");
    return units[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
  }
  let result = "";
  let temp = num;
  if (temp >= 10000000) {
    result += convert(Math.floor(temp / 10000000)) + "Crore ";
    temp %= 10000000;
  }
  if (temp >= 100000) {
    result += convert(Math.floor(temp / 100000)) + "Lakh ";
    temp %= 100000;
  }
  if (temp >= 1000) {
    result += convert(Math.floor(temp / 1000)) + "Thousand ";
    temp %= 1000;
  }
  result += convert(temp);
  return result.trim();
}

const STYLES = StyleSheet.create({
  page: {
    fontFamily: "Geist",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  header: {
    backgroundColor: "#0f0e0c",
    color: "#ffffff",
    padding: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandBox: {
    flexDirection: "column",
  },
  brandName: {
    fontFamily: "Geist",
    fontSize: 28,
    marginBottom: 2,
    fontWeight: "bold",
  },
  brandSub: {
    color: "#c8a96e",
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 2,
  },
  docMetaBox: {
    alignItems: "flex-end",
  },
  docLabel: {
    fontSize: 8,
    color: "#c8a96e",
    letterSpacing: 2,
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  docSubText: {
    fontSize: 9,
    color: "#aaaaaa",
    textAlign: "right",
    lineHeight: 1.3,
  },
  section: {
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  colHalf: {
    width: "48%",
  },
  textBold: {
    fontWeight: "bold",
    fontFamily: "Geist",
    fontSize: 10,
    marginBottom: 4,
    color: "#000000",
  },
  textNormal: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.3,
    fontFamily: "Geist",
  },
  textMuted: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.3,
    fontFamily: "Geist",
  },
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 8,
  },
  thLabel: {
    fontSize: 9,
    fontFamily: "Geist",
    fontWeight: "bold",
  },
  tableBodyRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },
  tdValue: {
    fontSize: 10,
  },
  col1: { width: "40%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "15%", textAlign: "right" },
  totalsWrapper: {
    width: "100%",
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 260,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: "#333333",
  },
  totalValue: {
    fontSize: 10,
    color: "#333333",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#000000",
    paddingTop: 10,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontFamily: "Geist",
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 16,
    fontFamily: "Geist",
    fontWeight: "bold",
  },
  footerNotes: {
    fontSize: 10,
    color: "#666666",
  },
  bottomBand: {
    backgroundColor: "#0f0e0c",
    paddingHorizontal: 30,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bandText: {
    color: "#aaaaaa",
    fontSize: 10,
  }
});

const InvoiceDocument = ({
  invoiceNumber,
  user,
  billing,
  ownerPayment,
  amount,
  gstAmount,
  totalAmount,
  bookingId,
}: InvoiceData) => {
  const isOwnerGST = !!ownerPayment;
  const billedBy = ownerPayment || ARKANET_VENTURES_GST;
  const customerName = user.name || user.email || "Customer";
  const cgst = (gstAmount / 2).toFixed(2);
  const sgst = (gstAmount / 2).toFixed(2);
  const invoiceDate = format(new Date(), "dd MMMM yyyy");

  return (
    <Document>
      <Page size="A4" style={STYLES.page}>
        <View style={STYLES.header}>
          <View style={STYLES.brandBox}>
            <Text style={STYLES.brandName}>ContCave</Text>
            <Text style={STYLES.brandSub}>BY ARKANET VENTURES LLP</Text>
          </View>
          <View style={STYLES.docMetaBox}>
            <Text style={STYLES.docLabel}>DOCUMENT</Text>
            <Text style={STYLES.docTitle}>TAX INVOICE</Text>
            <View style={{ marginTop: 6 }}>
              <Text style={STYLES.docSubText}>Invoice No: {invoiceNumber}</Text>
              <Text style={STYLES.docSubText}>Invoice Date: {invoiceDate}</Text>
              <Text style={STYLES.docSubText}>Place: Uttar Pradesh</Text>
            </View>
          </View>
        </View>

        <View style={[STYLES.section, STYLES.row]}>
          <View style={STYLES.colHalf}>
            <Text style={STYLES.textBold}>Payment Mode</Text>
            <Text style={STYLES.textNormal}>Online / UPI</Text>
          </View>
          <View style={STYLES.colHalf}>
            <Text style={STYLES.textBold}>SAC Code</Text>
            <Text style={STYLES.textNormal}>{DEFAULT_SAC_CODE}</Text>
          </View>
        </View>

        <View style={[STYLES.section, STYLES.row]}>
          <View style={STYLES.colHalf}>
            <Text style={STYLES.textBold}>Billed By</Text>
            <View style={{ marginBottom: 4 }} />
            <Text style={STYLES.textNormal}>{billedBy.companyName}</Text>
            {isOwnerGST && <Text style={STYLES.textNormal}>c/o Studio Owner</Text>}
            {!isOwnerGST && <Text style={STYLES.textNormal}>SN/317-A, Shanti Nagar, Lucknow</Text>}
            <Text style={STYLES.textNormal}>State: Uttar Pradesh – 226008</Text>
            <Text style={STYLES.textNormal}>Email: info@contcave.com</Text>
            <Text style={STYLES.textNormal}>GSTIN: {billedBy.gstin}</Text>
          </View>
          <View style={STYLES.colHalf}>
            <Text style={STYLES.textBold}>Billed To</Text>
            <View style={{ marginBottom: 4 }} />
            {billing?.companyName ? (
              <>
                <Text style={STYLES.textNormal}>{billing.companyName}</Text>
                <Text style={STYLES.textNormal}>{customerName}</Text>
                <Text style={STYLES.textNormal}>GSTIN: {billing.gstin || "N/A"}</Text>
              </>
            ) : (
              <>
                <Text style={STYLES.textNormal}>{customerName}</Text>
                <Text style={STYLES.textNormal}>{user.email}</Text>
              </>
            )}
          </View>
        </View>

        <View style={STYLES.section}>
          <Text style={STYLES.textBold}>Booking Details</Text>
          <View style={{ marginBottom: 4 }} />
          <Text style={STYLES.textNormal}>Studio Booking Services</Text>
          {bookingId && <Text style={STYLES.textNormal}>Booking ID: {bookingId}</Text>}
        </View>

        <View style={STYLES.section}>
          <View style={STYLES.tableHeaderRow}>
            <Text style={[STYLES.thLabel, STYLES.col1]}>Description</Text>
            <Text style={[STYLES.thLabel, STYLES.col2]}>HSN/SAC</Text>
            <Text style={[STYLES.thLabel, STYLES.col3]}>Base</Text>
            <Text style={[STYLES.thLabel, STYLES.col4]}>GST ({(GST_RATE * 100).toFixed(0)}%)</Text>
            <Text style={[STYLES.thLabel, STYLES.col5]}>Total</Text>
          </View>

          <View style={STYLES.tableBodyRow}>
            <View style={STYLES.col1}>
              <Text style={STYLES.textNormal}>Studio Space Rental</Text>
              <Text style={STYLES.textMuted}>Platform Booking Services</Text>
            </View>
            <Text style={[STYLES.textNormal, STYLES.col2]}>{DEFAULT_SAC_CODE}</Text>
            <Text style={[STYLES.textNormal, STYLES.col3]}>₹{amount.toFixed(2)}</Text>
            <Text style={[STYLES.textNormal, STYLES.col4]}>₹{gstAmount.toFixed(2)}</Text>
            <Text style={[STYLES.textNormal, STYLES.col5, { textAlign: "right" }]}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={STYLES.totalsWrapper}>
          <View style={STYLES.totalsBox}>
            <View style={STYLES.totalRow}>
              <Text style={STYLES.totalLabel}>Subtotal</Text>
              <Text style={STYLES.totalValue}>₹{amount.toFixed(2)}</Text>
            </View>
            <View style={STYLES.totalRow}>
              <Text style={STYLES.totalLabel}>CGST (9%)</Text>
              <Text style={STYLES.totalValue}>₹{cgst}</Text>
            </View>
            <View style={STYLES.totalRow}>
              <Text style={STYLES.totalLabel}>SGST (9%)</Text>
              <Text style={STYLES.totalValue}>₹{sgst}</Text>
            </View>
            <View style={STYLES.grandTotalRow}>
              <Text style={STYLES.grandTotalLabel}>Total</Text>
              <Text style={STYLES.grandTotalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={[STYLES.section, { borderBottomWidth: 0, paddingVertical: 0 }]}>
          <Text style={STYLES.textBold}>Amount in Words</Text>
          <Text style={STYLES.textNormal}>
            Rupees {numberToWordsINR(Math.round(totalAmount))} Only
          </Text>
        </View>

        <View style={[STYLES.section, { borderBottomWidth: 0, marginTop: 4 }]}>
          <Text style={STYLES.footerNotes}>
            This is a computer-generated invoice and does not require a physical signature.
            {"\n"}
            Service rendered by {isOwnerGST ? "Studio Owner" : ARKANET_VENTURES_GST.companyName}.
          </Text>
        </View>

        <View style={STYLES.bottomBand}>
          <Text style={STYLES.bandText}>Arkanet Ventures LLP</Text>
          <Text style={STYLES.bandText}>contcave.com</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateInvoicePDFBlob(data: InvoiceData): Promise<Blob> {
  const buffer = await renderToBuffer(<InvoiceDocument {...data} />);
  return new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
}
