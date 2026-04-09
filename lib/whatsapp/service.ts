import type { AxiosInstance } from "axios";
import axios, { AxiosError } from "axios";

/* ------------------------------------------------------------------ */
/*  Constants & Config                                                 */
/* ------------------------------------------------------------------ */

const API_VERSION = "v21.0";
const WHATSAPP_API_URL = `https://graph.facebook.com/${API_VERSION}`;
const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ */
/*  Lazy singleton – avoids module-level env-var crash                 */
/* ------------------------------------------------------------------ */

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
    if (!_client) {
        _client = axios.create({ timeout: REQUEST_TIMEOUT_MS });
    }
    return _client;
}

function getCredentials(): { phoneNumberId: string; accessToken: string } {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        throw new Error(
            "WhatsApp credentials missing: WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set."
        );
    }
    return { phoneNumberId, accessToken };
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TemplateParameter = {
    type: string;
    text?: string;
    [key: string]: unknown;
};

type TemplateComponent = {
    type: "header" | "body" | "button";
    parameters: TemplateParameter[];
    sub_type?: string;
    index?: number;
};

type SendTemplateInput = {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: TemplateComponent[];
    idempotencyKey?: string;
};

type WhatsAppApiError = {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
};

type WhatsAppSendResult = {
    success: boolean;
    messageId: string | null;
    raw: unknown;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse an AxiosError into a structured error context object.
 * Centralises the duplicated error-handling that was scattered around.
 */
function parseApiError(error: unknown): {
    status: number | undefined;
    code: string | undefined;
    message: string;
    retryable: boolean;
    retryAfterMs: number | undefined;
    raw: unknown;
} {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const code = error.code;
        const data = error.response?.data as WhatsAppApiError | undefined;

        const message = data?.error?.message
            ? `[${data.error.code ?? status}] ${data.error.message}`
            : error.message;

        // Parse Retry-After header (seconds) for 429 responses
        let retryAfterMs: number | undefined;
        const retryAfterHeader = error.response?.headers?.["retry-after"];
        if (retryAfterHeader) {
            const seconds = parseInt(String(retryAfterHeader), 10);
            if (Number.isFinite(seconds) && seconds > 0) {
                retryAfterMs = seconds * 1_000;
            }
        }

        // Determine retryability per WhatsApp Cloud API error codes
        const isRateLimited = status === 429;
        const isServerError = status !== undefined && status >= 500 && status < 600;
        const isNetworkError =
            code === "ECONNABORTED" ||
            code === "ETIMEDOUT" ||
            code === "ECONNRESET" ||
            code === "ENOTFOUND";

        // Auth errors are never retryable
        const isAuthError = status === 401 || status === 403;
        // WhatsApp-specific non-retryable error codes (invalid params, template not found, etc.)
        const waErrorCode = data?.error?.code;
        const isNonRetryableWAError =
            waErrorCode === 100 || // Invalid parameter
            waErrorCode === 131030 || // Template not found / parameter mismatch
            waErrorCode === 131026 || // Recipient not on WhatsApp
            waErrorCode === 132000; // Template param count mismatch

        const retryable =
            !isAuthError &&
            !isNonRetryableWAError &&
            (isRateLimited || isServerError || isNetworkError);

        return { status, code, message, retryable, retryAfterMs, raw: data };
    }

    if (error instanceof Error) {
        return {
            status: undefined,
            code: undefined,
            message: error.message,
            retryable: false,
            retryAfterMs: undefined,
            raw: undefined,
        };
    }

    return {
        status: undefined,
        code: undefined,
        message: String(error),
        retryable: false,
        retryAfterMs: undefined,
        raw: undefined,
    };
}

/**
 * Calculate delay for exponential backoff with jitter.
 * Respects Retry-After header when available (enterprise best-practice).
 */
function calculateRetryDelay(attempt: number, retryAfterMs?: number): number {
    const exponentialMs = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
    const jitter = Math.random() * 500;
    const base = retryAfterMs && retryAfterMs > 0 ? Math.max(retryAfterMs, exponentialMs) : exponentialMs;
    return base + jitter;
}

/* ------------------------------------------------------------------ */
/*  Phone Number Formatting (E.164)                                    */
/* ------------------------------------------------------------------ */

/**
 * Normalise a phone number to E.164 format without the leading '+'.
 * - Strips all non-digit characters (including `+`)
 * - For 10-digit numbers, prepends the configurable default country code
 * - Validates final length is 10-15 digits (ITU-T E.164)
 */
function formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10) {
        return `${DEFAULT_COUNTRY_CODE}${cleaned}`;
    }

    if (cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
    }

    return null;
}

/* ------------------------------------------------------------------ */
/*  Core Service                                                       */
/* ------------------------------------------------------------------ */

export const WhatsappService = {
    formatPhoneNumber,

    /**
     * Send a WhatsApp template message with enterprise-grade retry,
     * Retry-After compliance, idempotency support, and structured logging.
     */
    async sendMessage({
        to,
        templateName,
        languageCode = "en",
        components = [],
        idempotencyKey,
    }: SendTemplateInput): Promise<WhatsAppSendResult> {
        const { phoneNumberId, accessToken } = getCredentials();

        const formattedTo = formatPhoneNumber(to);
        if (!formattedTo) {
            const error = new Error(`Invalid phone number for WhatsApp: ${to}`);
            console.error("[WhatsApp] Invalid phone number", { to, templateName });
            throw error;
        }

        const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            to: formattedTo,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        };

        const headers: Record<string, string> = {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };

        if (idempotencyKey) {
            headers["Idempotency-Key"] = idempotencyKey;
        }

        let lastParsed: ReturnType<typeof parseApiError> | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await getClient().post(url, payload, { headers });
                const messageId: string | null =
                    response.data?.messages?.[0]?.id ?? null;

                console.warn("[WhatsApp] Message sent", {
                    to: formattedTo,
                    templateName,
                    messageId,
                    attempt,
                });

                return { success: true, messageId, raw: response.data };
            } catch (error: unknown) {
                lastParsed = parseApiError(error);

                // Non-retryable — fail fast
                if (!lastParsed.retryable) {
                    console.error("[WhatsApp] Non-retryable error", {
                        to: formattedTo,
                        templateName,
                        attempt,
                        status: lastParsed.status,
                        code: lastParsed.code,
                        error: lastParsed.message,
                    });
                    throw new Error(`WhatsApp API error: ${lastParsed.message}`);
                }

                // Retryable — log and wait
                if (attempt < MAX_RETRIES) {
                    const delayMs = calculateRetryDelay(attempt, lastParsed.retryAfterMs);
                    console.warn("[WhatsApp] Retrying", {
                        to: formattedTo,
                        templateName,
                        attempt,
                        maxRetries: MAX_RETRIES,
                        delayMs: Math.round(delayMs),
                        status: lastParsed.status,
                        error: lastParsed.message,
                    });
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }

        // All retries exhausted
        const finalMessage = lastParsed?.message ?? "Unknown error";
        console.error("[WhatsApp] All retries exhausted", {
            to: formattedTo,
            templateName,
            attempts: MAX_RETRIES,
            lastError: finalMessage,
            lastStatus: lastParsed?.status,
        });
        throw new Error(`WhatsApp API error after ${MAX_RETRIES} attempts: ${finalMessage}`);
    },

    /* ------------------------------------------------------------------ */
    /*  Template Helpers                                                    */
    /* ------------------------------------------------------------------ */

    /** Notify host that a new booking was received (pending approval). */
    async sendBookingReceivedHost(
        to: string,
        params: {
            hostName: string;
            customerName: string;
            listingTitle: string;
            startDate: string;
            startTime: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_received_host",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.hostName },
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                        { type: "text", text: params.startTime },
                    ],
                },
            ],
        });
    },

    /** Notify customer that their booking is confirmed (instant booking or approved by host). */
    async sendBookingConfirmedCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            startDate: string;
            startTime: string;
            locationLink: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_confirmed_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                        { type: "text", text: params.startTime },
                        { type: "text", text: params.locationLink },
                    ],
                },
            ],
        });
    },

    /** Remind customer about their upcoming booking (sent day before). */
    async sendBookingReminderCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            startTime: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_reminder_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startTime },
                    ],
                },
            ],
        });
    },

    /** Notify host that their payout has been transferred. */
    async sendPaymentTransferredHost(
        to: string,
        params: {
            hostName: string;
            amount: string;
            listingTitle: string;
            date: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "payment_transferred_host",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.hostName },
                        { type: "text", text: params.amount },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.date },
                    ],
                },
            ],
        });
    },

    /* ------------------------------------------------------------------ */
    /*  New Template Stubs (create in WhatsApp Business Manager first)     */
    /* ------------------------------------------------------------------ */

    /**
     * Acknowledge customer that their booking request was received (non-instant booking).
     * Template must be created in WhatsApp Business Manager as "booking_received_customer".
     */
    async sendBookingReceivedCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            startDate: string;
            startTime: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_received_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                        { type: "text", text: params.startTime },
                    ],
                },
            ],
        });
    },

    /**
     * Notify host that the customer cancelled their booking.
     * Template must be created in WhatsApp Business Manager as "booking_cancelled_host".
     */
    async sendBookingCancelledHost(
        to: string,
        params: {
            hostName: string;
            customerName: string;
            listingTitle: string;
            startDate: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_cancelled_host",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.hostName },
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                    ],
                },
            ],
        });
    },

    /**
     * Notify customer that their booking was rejected by the host.
     * Template must be created in WhatsApp Business Manager as "booking_rejected_customer".
     */
    async sendBookingRejectedCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            rejectReason?: string;
        }
    ): Promise<WhatsAppSendResult> {
        return this.sendMessage({
            to,
            templateName: "booking_rejected_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.rejectReason || "Not provided" },
                    ],
                },
            ],
        });
    },
};
