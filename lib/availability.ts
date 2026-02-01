import prisma from "@/lib/prismadb";


export function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;

    const m12 = timeStr.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const min = parseInt(m12[2], 10);
        const period = m12[3].toUpperCase();
        if (period === "PM" && h < 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + min;
    }

    const m24 = timeStr.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
    if (m24) {
        return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    }

    return 0;
}


export function checkTimeOverlap(
    existingStart: number,
    existingEnd: number,
    requestedStart: number,
    requestedEnd: number
): boolean {
    return existingStart < requestedEnd && requestedStart < existingEnd;
}


export function hasSetIntersection(setIds1: string[], setIds2: string[]): boolean {
    if (setIds1.length === 0 || setIds2.length === 0) return false;
    const set1 = new Set(setIds1);
    return setIds2.some((id) => set1.has(id));
}

export interface ConflictCheckParams {
    listingId: string;
    date: Date;
    startTime: string;
    endTime: string;
    setIds: string[];
    excludeReservationId?: string;
}

export interface ConflictResult {
    hasConflict: boolean;
    conflictType?: "block" | "reservation";
    conflictDetails?: string;
}


export async function checkSetConflicts(
    params: ConflictCheckParams
): Promise<ConflictResult> {
    const { listingId, date, startTime, endTime, setIds, excludeReservationId } = params;

    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = parseTimeToMinutes(endTime);

    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { hasSets: true },
    });

    const [blocks, reservations] = await Promise.all([
        prisma.listingBlock.findMany({
            where: {
                listingId,
                date: { gte: dateStart, lte: dateEnd },
            },
        }),
        prisma.reservation.findMany({
            where: {
                listingId,
                startDate: { gte: dateStart, lte: dateEnd },
                markedForDeletion: false,
                ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                setIds: true,
            },
        }),
    ]);

    for (const block of blocks) {
        const blockStart = parseTimeToMinutes(block.startTime);
        const blockEnd = parseTimeToMinutes(block.endTime);

        if (!checkTimeOverlap(blockStart, blockEnd, requestedStart, requestedEnd)) {
            continue;
        }

        const isListingWide = !block.setIds || block.setIds.length === 0;
        if (isListingWide) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: block.reason || "This time slot is blocked.",
            };
        }

        if (setIds.length > 0 && hasSetIntersection(block.setIds, setIds)) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: block.reason || "Selected sets are blocked during this time.",
            };
        }
    }

    for (const reservation of reservations) {
        const resStart = parseTimeToMinutes(reservation.startTime);
        const resEnd = parseTimeToMinutes(reservation.endTime);

        if (!checkTimeOverlap(resStart, resEnd, requestedStart, requestedEnd)) {
            continue;
        }

        if (!listing?.hasSets) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "This time slot is already booked.",
            };
        }

        const resSetIds = reservation.setIds || [];
        const isLegacyReservation = resSetIds.length === 0;

        if (isLegacyReservation) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "This time slot has an existing booking that blocks all sets.",
            };
        }

        if (setIds.length > 0 && hasSetIntersection(resSetIds, setIds)) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "One or more selected sets are already booked during this time.",
            };
        }
    }

    return { hasConflict: false };
}


export async function getBlockedSlots(
    listingId: string,
    date: Date,
    setIds?: string[]
): Promise<Array<{ startTime: string; endTime: string; reason?: string | null }>> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const [blocks, reservations] = await Promise.all([
        prisma.listingBlock.findMany({
            where: {
                listingId,
                date: { gte: dateStart, lte: dateEnd },
            },
        }),
        prisma.reservation.findMany({
            where: {
                listingId,
                startDate: { gte: dateStart, lte: dateEnd },
                markedForDeletion: false,
            },
            select: {
                startTime: true,
                endTime: true,
                setIds: true,
            },
        }),
    ]);

    const blockedSlots: Array<{ startTime: string; endTime: string; reason?: string | null }> = [];

    for (const block of blocks) {
        const isListingWide = !block.setIds || block.setIds.length === 0;
        const affectsRequestedSets =
            setIds && setIds.length > 0 && hasSetIntersection(block.setIds, setIds);

        if (isListingWide || affectsRequestedSets) {
            blockedSlots.push({
                startTime: block.startTime,
                endTime: block.endTime,
                reason: block.reason,
            });
        }
    }

    for (const reservation of reservations) {
        const resSetIds = reservation.setIds || [];
        const isLegacyReservation = resSetIds.length === 0;
        const affectsRequestedSets =
            setIds && setIds.length > 0 && hasSetIntersection(resSetIds, setIds);

        if (isLegacyReservation || !setIds || setIds.length === 0 || affectsRequestedSets) {
            blockedSlots.push({
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                reason: null,
            });
        }
    }

    return blockedSlots;
}


export async function getAvailableSets(
    listingId: string,
    date: Date,
    startTime: string,
    endTime: string
): Promise<string[]> {
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { sets: true },
    });

    if (!listing || !listing.hasSets || !listing.sets || listing.sets.length === 0) {
        return [];
    }

    const allSets = listing.sets;
    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = parseTimeToMinutes(endTime);

    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const [blocks, reservations] = await Promise.all([
        prisma.listingBlock.findMany({
            where: {
                listingId,
                date: { gte: dateStart, lte: dateEnd },
            },
        }),
        prisma.reservation.findMany({
            where: {
                listingId,
                startDate: { gte: dateStart, lte: dateEnd },
                markedForDeletion: false,
            },
            select: {
                startTime: true,
                endTime: true,
                setIds: true,
            },
        }),
    ]);

    const availableSets: string[] = [];

    for (const set of allSets) {
        let hasConflict = false;


        for (const block of blocks) {
            const blockStart = parseTimeToMinutes(block.startTime);
            const blockEnd = parseTimeToMinutes(block.endTime);

            if (checkTimeOverlap(blockStart, blockEnd, requestedStart, requestedEnd)) {
                const isListingWide = !block.setIds || block.setIds.length === 0;
                if (isListingWide || block.setIds.includes(set.id)) {
                    hasConflict = true;
                    break;
                }
            }
        }

        if (hasConflict) continue;


        for (const res of reservations) {
            const resStart = parseTimeToMinutes(res.startTime);
            const resEnd = parseTimeToMinutes(res.endTime);

            if (checkTimeOverlap(resStart, resEnd, requestedStart, requestedEnd)) {
                const resSetIds = res.setIds || [];
                const isLegacy = resSetIds.length === 0;
                if (isLegacy || resSetIds.includes(set.id)) {
                    hasConflict = true;
                    break;
                }
            }
        }

        if (!hasConflict) {
            availableSets.push(set.id);
        }
    }

    return availableSets;
}

