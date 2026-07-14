import prisma from "@/lib/prismadb";
import { slugify } from "@/lib/strings";

export async function generateUniqueSlug(title: string): Promise<string> {
    // `slugify` intentionally keeps URL-safe ASCII only. Titles made entirely
    // from other scripts or punctuation still need a non-empty route segment.
    const baseSlug = slugify(title) || "listing";
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await prisma.listing.findUnique({
            where: { slug }
        });

        if (!existing) return slug;

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}
