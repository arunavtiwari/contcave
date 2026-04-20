import prisma from "@/lib/prismadb";

export function slugify(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-");
}

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
