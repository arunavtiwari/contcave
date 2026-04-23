import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { SafeUser, UserRole } from "@/types/user";

/**
 * Standardized Action Response format for all enterprise mutations.
 */
export type ActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
    details?: Record<string, unknown>;
};

/**
 * Configuration options for Server Actions.
 */
type ActionOptions = {
    requireAuth?: boolean;
    allowedRoles?: UserRole[];
};

/**
 * Server Action Wrapper.
 * 
 * Provides a standardized pipeline for mutations:
 * 1. Authentication & RBAC (Optional but enforced by default if specified)
 * 2. Zod-based Input Validation
 * 3. Standardized Error Handling & Logging
 * 4. User context injection for handlers
 */
export function createAction<TInput, TOutput>(
    schema: z.ZodType<TInput>,
    options: ActionOptions,
    handler: (data: TInput, ctx: { user: SafeUser | null }) => Promise<TOutput>
) {
    return async (input: unknown): Promise<ActionResponse<TOutput>> => {
        try {
            let currentUser = null;

            // 1. Auth & Role-Based Access Control
            if (options.requireAuth || options.allowedRoles) {
                currentUser = await getCurrentUser();

                if (options.requireAuth && !currentUser) {
                    return {
                        success: false,
                        error: "Unauthorized: Access restricted to authenticated users."
                    };
                }

                if (options.allowedRoles && (!currentUser || !options.allowedRoles.includes(currentUser.role as UserRole))) {
                    return {
                        success: false,
                        error: "Forbidden: You do not have the required permissions for this action."
                    };
                }
            }

            // 2. Input Validation
            const validation = schema.safeParse(input);
            if (!validation.success) {
                return {
                    success: false,
                    error: validation.error.issues[0].message
                };
            }

            // 3. Logic Execution with injected context
            const result = await handler(validation.data, { user: currentUser });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error("[Action Pipeline Failure]", {
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : "Identified failure",
                stack: error instanceof Error ? error.stack : undefined
            });

            const message = error instanceof Error ? error.message : "An internal server error occurred.";
            return {
                success: false,
                error: message
            };
        }
    };
}
