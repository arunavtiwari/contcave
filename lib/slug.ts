import prisma from "@/lib/prismadb";
import { slugify } from "@/lib/strings";

export async function generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
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
