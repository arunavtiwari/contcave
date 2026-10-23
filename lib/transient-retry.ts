import { Prisma } from "@prisma/client";

const RETRY_ATTEMPTS = 3;

function isTransientDatabaseError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
        || /write conflict|deadlock|transaction failed/i.test(message);
}

export async function withTransientRetry<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await operation(attempt);
        } catch (error) {
            if (!isTransientDatabaseError(error) || attempt >= RETRY_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt * 100 + Math.random() * 50));
        }
    }
}
