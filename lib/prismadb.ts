import 'server-only';

import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = client;
}

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            await client.$runCommandRaw({
                createIndexes: "Listing",
                indexes: [
                    {
                        key: { locationPoint: "2dsphere" },
                        name: "locationPoint_2dsphere",
                    },
                ],
            });
            // Silently succeeds to keep logs clean
        } catch (error) {
            console.error("[Prisma] Error ensuring geospatial indexes:", error);
        }
    })();
}

export default client;
