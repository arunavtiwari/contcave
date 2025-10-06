// /lib/invoice/pdfBlob.ts
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type InvoiceData = {
  invoiceNumber: string;
  user: any;
  billing: any | null;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  reservationId: string;
};

export async function generateInvoicePDFBlob(data: InvoiceData) {
  const { invoiceNumber, user, billing, amount, gstAmount, totalAmount } = data;

  // Create a hidden div for rendering invoice
  const container = document.createElement("div");
  container.style.width = "800px";
  container.style.padding = "24px";
  container.style.background = "#fff";
  container.innerHTML = `
    <h1>Invoice</h1>
    <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
    <p><strong>Customer:</strong> ${user.name || user.email}</p>
    ${billing ? `<p><strong>Company:</strong> ${billing.companyName}</p>` : ""}
    <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
    <p><strong>GST (18%):</strong> ₹${gstAmount.toFixed(2)}</p>
    <p><strong>Total:</strong> ₹${totalAmount.toFixed(2)}</p>
    <p>Thank you for booking with us!</p>
  `;

  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/jpeg", 0.9);
  const pdf = new jsPDF("p", "mm", "a4", true);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pdfHeight);

  const blob = pdf.output("blob");
  return blob;
}
