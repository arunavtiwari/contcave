import { z } from "zod";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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

  // 2. Customer Details
  customerName: z.string().trim().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits"),
  customerEmail: z.string().trim().email("Valid customer email is required"),
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
});

export type CreateAdminOfflineBookingInput = z.infer<typeof createAdminOfflineBookingSchema>;
