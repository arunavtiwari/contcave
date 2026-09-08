import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { UserFacingError } from "@/lib/errors";
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
    includeUser?: boolean;
};

type AuthenticatedActionOptions =
    | { requireAuth: true; allowedRoles?: UserRole[] }
    | { requireAuth?: boolean; allowedRoles: UserRole[] };

type PublicActionOptions = { requireAuth?: false; allowedRoles?: undefined; includeUser?: boolean };
type ActionHandler<TSchema extends z.ZodType, TOutput, TUser extends SafeUser | null> = (
    data: z.output<TSchema>,
    ctx: { user: TUser }
) => Promise<TOutput>;
type ServerAction<TSchema extends z.ZodType, TOutput> = (
    input: z.input<TSchema>
) => Promise<ActionResponse<TOutput>>;

/**
 * Server Action Wrapper.
 * 
 * Provides a standardized pipeline for mutations:
 * 1. Authentication & RBAC (Optional but enforced by default if specified)
 * 2. Zod-based Input Validation
 * 3. Standardized Error Handling & Logging
 * 4. User context injection for handlers
 */
export function createAction<TSchema extends z.ZodType, TOutput>(
    schema: TSchema,
    options: AuthenticatedActionOptions,
    handler: ActionHandler<TSchema, TOutput, SafeUser>
): ServerAction<TSchema, TOutput>;
export function createAction<TSchema extends z.ZodType, TOutput>(
    schema: TSchema,
    options: PublicActionOptions,
    handler: ActionHandler<TSchema, TOutput, SafeUser | null>
): ServerAction<TSchema, TOutput>;
export function createAction<TSchema extends z.ZodType, TOutput>(
    schema: TSchema,
    options: ActionOptions,
    handler: ActionHandler<TSchema, TOutput, SafeUser> | ActionHandler<TSchema, TOutput, SafeUser | null>
): ServerAction<TSchema, TOutput> {
    return async (input: z.input<TSchema>): Promise<ActionResponse<TOutput>> => {
        try {
            let currentUser = null;

            // 1. Auth & Role-Based Access Control
            if (options.requireAuth || options.allowedRoles || options.includeUser) {
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
            const execute = handler as ActionHandler<TSchema, TOutput, SafeUser | null>;
            const result = await execute(validation.data, { user: currentUser });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            if (!(error instanceof UserFacingError)) {
                console.error("[Action Pipeline Failure]", {
                    timestamp: new Date().toISOString(),
                    error: error instanceof Error ? error.message : "Identified failure",
                    stack: error instanceof Error ? error.stack : undefined
                });
            }

            const message = error instanceof UserFacingError
                ? error.message
                : process.env.NODE_ENV === "production"
                    ? "An internal server error occurred."
                    : error instanceof Error
                        ? error.message
                        : "An internal server error occurred.";
            return {
                success: false,
                error: message
            };
        }
    };
}
