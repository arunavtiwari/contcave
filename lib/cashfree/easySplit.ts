import { cfHeaders, cfSplitBaseURL } from "@/lib/cashfree/cashfree";

type SplitItem = {
    vendor_id: string;
    percentage?: number;
    amount?: number;
    tags?: Record<string, string>;
};

export type CreateOrderSplitInput = {
    orderId: string;
    split: SplitItem[];
    idempotencyKey: string;
    disable_split?: boolean;
};

export class CashfreeEasySplitAPIError extends Error {
    constructor(message: string, public status: number, public responseContext?: Record<string, unknown>) {
        super(`Cashfree Easy Split API Error: ${message}`);
        this.name = "CashfreeEasySplitAPIError";
    }
}

export async function createOrderSplit(input: CreateOrderSplitInput): Promise<void> {
    const { orderId, split, idempotencyKey, disable_split } = input;

    const url = `${cfSplitBaseURL()}/orders/${encodeURIComponent(orderId)}/split`;

    const body: Record<string, unknown> = { split };
    if (typeof disable_split === "boolean") {
        body.disable_split = disable_split;
    }

    const headers: Record<string, string> = {
        ...cfHeaders(),
        "x-api-version": "2025-01-01",
    };

    if (idempotencyKey) {
        headers["x-idempotency-key"] = idempotencyKey;
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        let responseContext: Record<string, unknown> | undefined = undefined;

        try {
            const ctx = await response.json();
            if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
                responseContext = ctx as Record<string, unknown>;
                const msg = responseContext.message ?? responseContext.status;
                if (msg) errorMessage = String(msg);
            }
        } catch {
            // Ignore JSON parsing errors
        }

        throw new CashfreeEasySplitAPIError(errorMessage, response.status, responseContext);
    }
}
