import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import prisma from "@/lib/prismadb";

type OwnerPaymentDetails = {
  ownerName?: string | null;
  companyName: string;
  gstin: string;
};

type InvoiceData = {
  invoiceNumber: string;
  user: any;
  billing: any | null;
  ownerPayment?: OwnerPaymentDetails | null;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  reservationId: string;
};

export async function generateInvoicePDFBlob(data: InvoiceData) {
  const {
    invoiceNumber,
    user,
    billing,
    ownerPayment,
    amount,
    gstAmount,
    totalAmount,
  } = data;

  // Create a hidden div for rendering invoice
  const container = document.createElement("div");
  container.style.width = "800px";
  container.style.padding = "24px";
  container.style.background = "#fff";
  container.innerHTML = `
    <h1>Invoice</h1>
    <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
    <p><strong>Customer:</strong> ${user.name || user.email}</p>
    ${
      billing
        ? `<div style="margin: 12px 0;">
            <p><strong>Bill To:</strong> ${billing.companyName}</p>
            ${
              billing.gstin
                ? `<p><strong>GSTIN:</strong> ${billing.gstin}</p>`
                : ""
            }
          </div>`
        : ""
    }
    ${
      ownerPayment
        ? `<div style="margin: 12px 0;">
            <p><strong>Seller:</strong> ${
              ownerPayment.ownerName ?? "Listing Owner"
            }</p>
            <p><strong>Seller Company:</strong> ${
              ownerPayment.companyName
            }</p>
            <p><strong>Seller GSTIN:</strong> ${ownerPayment.gstin}</p>
          </div>`
        : ""
    }
    <p><strong>Amount:</strong> INR ${amount.toFixed(2)}</p>
    <p><strong>GST (18%):</strong> INR ${gstAmount.toFixed(2)}</p>
    <p><strong>Total:</strong> INR ${totalAmount.toFixed(2)}</p>
    <p>Thank you for booking with us!</p>
  `;

  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/jpeg", 0.9);
  const pdf = new jsPDF("p", "mm", "a4", true);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgProps = pdf.getImageProperties(imgData);
  const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pdfHeight);

  const blob = pdf.output("blob");
  return blob;
}

/**
 * Wrapper that creates the invoice record and returns a Blob URL.
 */
export async function createInvoice({
  userId,
  reservationId,
  transactionId,
  amount,
}: {
  userId: string;
  reservationId: string;
  transactionId: string;
  amount: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { billingDetails: { where: { isDefault: true }, take: 1 } },
  });
  if (!user) throw new Error("User not found");

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      listing: {
        include: {
          user: {
            include: { paymentDetails: true },
          },
        },
      },
    },
  });

  if (!reservation) throw new Error("Reservation not found");

  const ownerPayment =
    reservation.listing?.user?.paymentDetails &&
    reservation.listing.user.paymentDetails.companyName &&
    reservation.listing.user.paymentDetails.gstin
      ? {
          companyName: reservation.listing.user.paymentDetails.companyName,
          gstin: reservation.listing.user.paymentDetails.gstin,
          ownerName:
            reservation.listing.user.name ||
            reservation.listing.user.email ||
            "Listing Owner",
        }
      : null;

  const billing = user.billingDetails?.[0] ?? null;
  const gstRate = 0.18;
  const gstAmount = amount * gstRate;
  const totalAmount = amount + gstAmount;
  const invoiceNumber = `CC-${Date.now()}`;

  // Generate PDF blob
  const blob = await generateInvoicePDFBlob({
    invoiceNumber,
    user,
    billing,
    ownerPayment,
    amount,
    gstAmount,
    totalAmount,
    reservationId,
  });

  // Store as Object URL or in S3 / Cloudflare R2 / Supabase (for production, use real file storage)
  const url = URL.createObjectURL(blob);

  await prisma.invoice.create({
    data: {
      userId,
      reservationId,
      transactionId,
      billingId: billing?.id,
      amount,
      gstAmount,
      totalAmount,
      invoiceNumber,
      invoiceUrl: url,
    },
  });

  return url;
}
