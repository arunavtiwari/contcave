import { NextResponse } from 'next/server';

import { UserFacingError } from '@/lib/errors';

export type JsonObjectResult =
    | { success: true; data: Record<string, unknown> }
    | { success: false; response: NextResponse };

export async function readJsonObject(
    request: Request,
    maxBytes: number = 50_000
): Promise<JsonObjectResult> {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        return { success: false, response: createErrorResponse('Content-Type must be application/json', 415) };
    }

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        return { success: false, response: createErrorResponse('Request body too large', 413) };
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
        return { success: false, response: createErrorResponse('Request body too large', 413) };
    }

    try {
        const data: unknown = JSON.parse(rawBody);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { success: false, response: createErrorResponse('Request body must be a JSON object', 400) };
        }
        return { success: true, data: data as Record<string, unknown> };
    } catch {
        return { success: false, response: createErrorResponse('Invalid JSON body', 400) };
    }
}

export function createErrorResponse(
    message: string,
    status: number = 500,
    details?: Record<string, unknown>
) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
            timestamp: new Date().toISOString(),
        },
        { status }
    );
}

export function createSuccessResponse<T>(
    data: T,
    status: number = 200,
    message?: string
) {
    return NextResponse.json(
        {
            success: true,
            data,
            ...(message ? { message } : {}),
            timestamp: new Date().toISOString(),
        },
        { status }
    );
}

export function handleRouteError(error: unknown, context?: string) {
    if (error instanceof UserFacingError) {
        return createErrorResponse(error.message, error.status);
    }

    console.error(`[Route Error${context ? `: ${context}` : ''}]`, error);

    if (error instanceof Error) {
        return createErrorResponse(
            process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : error.message,
            500,
            process.env.NODE_ENV === 'development'
                ? { stack: error.stack, context }
                : undefined
        );
    }

    return createErrorResponse('Unknown error occurred', 500);
}

export function createKnownErrorResponse(error: unknown) {
    if (!(error instanceof UserFacingError)) return null;
    return createErrorResponse(error.message, error.status);
}
