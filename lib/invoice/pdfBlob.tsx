import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { ARKANET_VENTURES_GST, GST_RATE } from "@/lib/constants/gst";

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

// Professional invoice styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1F2937",
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
    width: 120,
    color: "#374151",
  },
  value: {
    flex: 1,
    color: "#1F2937",
  },
  divider: {
    borderBottom: "1px solid #E5E7EB",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  infoBox: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoBoxGray: {
    backgroundColor: "#F9FAFB",
  },
  infoBoxYellow: {
    backgroundColor: "#FEF3C7",
  },
  infoBoxGreen: {
    backgroundColor: "#F0FDF4",
  },
  infoText: {
    fontSize: 9,
    color: "#6B7280",
    fontStyle: "italic",
  },
  warningText: {
    fontSize: 9,
    color: "#92400E",
  },
  table: {
    marginTop: 16,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderBottom: "1px solid #E5E7EB",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #E5E7EB",
  },
  tableRowTotal: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#F9FAFB",
    fontWeight: "bold",
  },
  tableColDescription: {
    flex: 2,
  },
  tableColAmount: {
    flex: 1,
    textAlign: "right",
  },
  thankYou: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 4,
  },
  thankYouText: {
    fontSize: 11,
    color: "#065F46",
  },
});

// React PDF Invoice Component
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
  // Determine who is responsible for GST
  const gstResponsibleParty = ownerPayment || {
    companyName: ARKANET_VENTURES_GST.companyName,
    gstin: ARKANET_VENTURES_GST.gstin,
  };

  const hasOwnerGST = !!ownerPayment;

  return (
    <Document>
      <Page size="A4" style={styles.page} >
        {/* Header */}
        < Text style={styles.header} > Tax Invoice </Text>

        < View style={styles.section} >
          <View style={styles.row}>
            <Text style={styles.label}> Invoice Number: </Text>
            < Text style={styles.value} > {invoiceNumber} </Text>
          </View>
          {bookingId && (
            <View style={styles.row}>
              <Text style={styles.label}> Booking ID: </Text>
              <Text style={styles.value}>{bookingId}</Text>
            </View>
          )}
        </View>

        < View style={styles.divider} />

        {/* Billed By (GST Responsible) */}
        < View style={styles.section} >
          <Text style={styles.sectionTitle}> Billed By(GST Responsible): </Text>
          < View style={styles.row} >
            <Text style={styles.value}> {gstResponsibleParty.companyName} </Text>
          </View>
          < View style={styles.row} >
            <Text style={styles.label}> GSTIN: </Text>
            < Text style={styles.value} > {gstResponsibleParty.gstin} </Text>
          </View>
        </View>

        {/* GST Ownership Notice */}
        {
          hasOwnerGST ? (
            <View style={[styles.infoBox, styles.infoBoxGray]} >
              <Text style={styles.infoText}>
                Service provided by studio owner with GST registration
              </Text>
            </View>
          ) : (
            <View style={[styles.infoBox, styles.infoBoxYellow]} >
              <Text style={styles.warningText}>
                <Text style={{ fontWeight: "bold" }}> Note: </Text> Studio owner does not have GST registration.
                GST collected and remitted by {ARKANET_VENTURES_GST.companyName}.
              </Text>
            </View>
          )}

        <View style={styles.divider} />

        {/* Billed To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}> Billed To: </Text>
          < View style={styles.row} >
            <Text style={styles.label}> Customer: </Text>
            < Text style={styles.value} > {user.name || user.email} </Text>
          </View>

          {
            billing?.companyName && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}> Company: </Text>
                  < Text style={styles.value} > {billing.companyName} </Text>
                </View>
                {
                  billing.gstin && (
                    <View style={styles.row}>
                      <Text style={styles.label}> GSTIN: </Text>
                      < Text style={styles.value} > {billing.gstin} </Text>
                    </View>
                  )
                }
              </>
            )
          }
        </View>

        < View style={styles.divider} />

        {/* Invoice Items Table */}
        < View style={styles.table} >
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDescription}> Description </Text>
            < Text style={styles.tableColAmount} > Amount(INR) </Text>
          </View>

          < View style={styles.tableRow} >
            <Text style={styles.tableColDescription}> Studio Booking </Text>
            < Text style={styles.tableColAmount} > {amount.toFixed(2)} </Text>
          </View>

          < View style={styles.tableRow} >
            <Text style={styles.tableColDescription}> GST({(GST_RATE * 100).toFixed(0)} %) </Text>
            < Text style={styles.tableColAmount} > {gstAmount.toFixed(2)} </Text>
          </View>

          < View style={styles.tableRowTotal} >
            <Text style={styles.tableColDescription}> Total </Text>
            < Text style={styles.tableColAmount} > {totalAmount.toFixed(2)} </Text>
          </View>
        </View>

        {/* Thank You Message */}
        <View style={styles.thankYou}>
          <Text style={styles.thankYouText}>
            Thank you for booking with ContCave!
          </Text>
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generate invoice PDF as a Blob using @react-pdf/renderer
 * Returns true vector PDF with selectable text (not rasterized image)
 */
export async function generateInvoicePDFBlob(data: InvoiceData): Promise<Blob> {
  const buffer = await renderToBuffer(<InvoiceDocument {...data} />);
  return new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
}
