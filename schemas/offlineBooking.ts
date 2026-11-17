import { z } from "zod";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const createAdminOfflineBookingSchema = z.object({
  // 1. Studio Details (Selected from platform)
  listingId: z.string().trim().min(1, "Please select a studio from the platform"),
  studioName: z.string().trim().optional().nullable(),
  studioEmail: z.string().trim().optional().nullable(),
  studioAddress: z.string().trim().optional().nullable(),
  studioGst: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine(
      (val) => !val || GSTIN_REGEX.test(val),
      "Studio GSTIN must be a valid 15-character format"
    ),
  propertyStateCode: z
    .string()
    .trim()
    .length(2, "State code must be 2 digits (e.g. 07)")
    .optional()
    .nullable(),

  // 2. Customer Details — all optional. Without an email the invoice isn't emailed (download
  // it instead); without a phone no WhatsApp is sent.
  customerName: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || val.length >= 2, "Customer name must be at least 2 characters"),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || (val.replace(/\D/g, "").length >= 10 && val.length <= 15),
      "Phone number must be 10–15 digits"
    ),
  customerEmail: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || z.string().email().safeParse(val).success, "Enter a valid email or leave it blank"),
  customerGst: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine(
      (val) => !val || GSTIN_REGEX.test(val),
      "Customer GSTIN must be a valid 15-character format"
    ),
  customerCompanyName: z.string().trim().optional().nullable(),
  customerBillingAddress: z.string().trim().optional().nullable(),

  // 3. Package / Booking Duration & Price
  bookingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Booking date must be in YYYY-MM-DD format"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  bookingType: z.enum(["HOURLY", "PACKAGE"]),
  packageId: z.string().optional().nullable(),
  packageName: z.string().trim().optional().nullable(),
  setIds: z.array(z.string()),
  hoursBooked: z.number().min(0.5, "Duration must be at least 0.5 hours"),
  price: z.number().min(1, "Price must be at least ₹1"),

  // 4. Payment Terms / Payment Made via (Internal Info)
  paymentMadeVia: z.string().trim().min(1, "Payment method is required"),
  paymentTerms: z.string().trim().min(1, "Payment terms are required"),
  internalNotes: z.string().trim().optional().nullable(),

  // 5. Payout breakdown inputs
  commissionPercent: z
    .number({ error: "Enter a commission %" })
    .min(0, "Commission can't be negative")
    .max(100, "Commission can't exceed 100%"),
  nonGstModel: z.enum(["principal", "passthrough"]),
  customStudioPrice: z.number().min(0).optional().nullable(),
  studioPan: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || PAN_REGEX.test(val), "PAN must look like ABCDE1234F"),
  studioHasNoPan: z.boolean(),
}).refine((data) => Boolean(data.studioGst) || data.nonGstModel !== "passthrough", {
  // Pass-through (C) is a what-if in the calculator until the bill-of-supply invoice exists.
  path: ["nonGstModel"],
  message: "Pass-through bookings can't be recorded until the bill-of-supply invoice is built. Use principal (B).",
});

export type CreateAdminOfflineBookingInput = z.infer<typeof createAdminOfflineBookingSchema>;
