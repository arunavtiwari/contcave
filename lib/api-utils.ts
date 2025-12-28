import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export async function validateRequest(
    request: NextRequest,
    requiredFields: string[]
): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: NextResponse }> {
    try {
        const contentType = request.headers.get('content-type');
        let body: Record<string, unknown>;

        if (contentType?.includes('application/json')) {
            body = await request.json();
        } else if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
        } else {
            return {
                valid: false,
                error: createErrorResponse('Invalid content type', 415),
            };
        }

        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            return {
                valid: false,
                error: createErrorResponse(
                    `Missing required fields: ${missingFields.join(', ')}`,
                    400
                ),
            };
        }

        return { valid: true, data: body };
    } catch (_error: unknown) {
        return {
            valid: false,
            error: createErrorResponse('Invalid request body', 400),
        };
    }
}
