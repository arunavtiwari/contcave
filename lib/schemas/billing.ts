import { z } from "zod";

export const billingSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(200),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  billingAddress: z.string().min(10, "Address too short (min 10 chars)").max(500),
  isDefault: z.boolean().default(false),
});

export type BillingSchema = z.infer<typeof billingSchema>;
