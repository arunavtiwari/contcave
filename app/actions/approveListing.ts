"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prismadb";

export default async function approveListing(_prevState: unknown, formData: FormData): Promise<{ success?: boolean; error?: string }> {
    const listingId = formData.get("listingId") as string;

    if (!listingId) {
        return { error: "Listing ID is required." };
    }

    try {
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: "VERIFIED",
                active: true,
            },
        });

        revalidatePath("/dashboard/listings");
        return { success: true };
    } catch (error: unknown) {
        return { error: `Failed to approve listing: ${String(error)}` };
    }
}
