import { describe, expect, it } from "vitest";

import { generateInvoicePDFBlob } from "@/lib/invoice/pdfBlob";

describe("generateInvoicePDFBlob", () => {
    it("rejects forbidden TDS wording", async () => {
        await expect(generateInvoicePDFBlob({
            documentType: "OWNER_MONTHLY_BILL_OF_SUPPLY",
            invoiceNumber: "QA-TEST",
            invoiceDate: new Date(),
            billedBy: { name: "QA Studio" },
            billedTo: { name: "ContCave" },
            lineItems: [{ description: "Studio service", taxableValue: 100 }],
            amount: 100,
            gstAmount: 0,
            totalAmount: 100,
            notes: ["This note mentions TDS and must fail."],
        })).rejects.toThrow(/TDS/i);
    });
});
