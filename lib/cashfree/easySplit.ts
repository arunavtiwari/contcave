import { cfSplitBaseURL, cfHeaders } from "./cashfree";

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
    constructor(message: string, public status: number, public responseContext?: any) {
        super(`Cashfree Easy Split API Error: ${message}`);
        this.name = "CashfreeEasySplitAPIError";
    }
}

export async function createOrderSplit(input: CreateOrderSplitInput): Promise<void> {
    const { orderId, split, idempotencyKey, disable_split } = input;

    const url = `${cfSplitBaseURL()}/orders/${encodeURIComponent(orderId)}/split`;

    const body: Record<string, any> = { split };
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
        let responseContext: any = null;

        try {
            responseContext = await response.json();
            errorMessage = responseContext?.message || responseContext?.status || errorMessage;
        } catch {
        }

        throw new CashfreeEasySplitAPIError(errorMessage, response.status, responseContext);
    }
}
