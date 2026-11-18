/** Escapes regular-expression characters so a search term matches literally. */
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Case-insensitive "contains" filter for Prisma on MongoDB. Prisma passes `contains` to Mongo as a
 * regex without escaping it, so terms like "name+tag@gmail.com" would otherwise never match.
 */
export const containsText = (term: string) => ({ contains: escapeRegex(term), mode: "insensitive" as const });
