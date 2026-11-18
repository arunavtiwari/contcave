import "server-only";

import { isObjectId } from "@/lib/db/objectId";
import prisma from "@/lib/prismadb";

export async function loadAmenityNames(listings: { amenities: string[] }[]): Promise<(ids: string[]) => string[]> {
    const ids = Array.from(new Set(listings.flatMap((listing) => listing.amenities))).filter(isObjectId);
    const amenities = ids.length
        ? await prisma.amenities.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
        : [];
    const names = new Map(amenities.map((amenity) => [amenity.id, amenity.name]));
    return (amenityIds) => amenityIds.map((id) => names.get(id)).filter((name): name is string => Boolean(name));
}
