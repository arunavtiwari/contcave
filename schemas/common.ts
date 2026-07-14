import { z } from "zod";

export const objectIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const userIdSchema = objectIdSchema;
