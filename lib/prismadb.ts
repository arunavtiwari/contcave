import 'server-only';

import { PrismaClient } from '@prisma/client';

import { invalidateStudioCaches, isStudioWrite } from '@/lib/listing/studioCacheInvalidation';

function createClient(): PrismaClient {
    const base = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Every write to studio data drops the cached studio pages, feed and snapshots, so no code path
    // (now or later) can leave visitors looking at stale studios, prices or blocked dates.
    const extended = base.$extends({
        name: 'studio-cache-invalidation',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const result = await query(args);
                    if (isStudioWrite(model, operation)) invalidateStudioCaches(`${model}.${operation}`);
                    return result;
                },
            },
        },
    });

    // A query-only extension adds no models, fields or methods, so the client keeps PrismaClient's
    // shape; Prisma's generated extension type just isn't assignable to Prisma.TransactionClient,
    // which the services' transaction helpers take.
    return extended as unknown as PrismaClient;
}

declare global {
    var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || createClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = client;
}

export default client;
