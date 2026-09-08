import axios from "axios";

import { cfPgHeaders, cfSplitBaseURL } from "@/lib/cashfree/cashfree";
import { getFixieProxyAgent } from "@/lib/fixie-proxy";

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
    const normalizedOrderId = orderId.trim();
    const normalizedIdempotencyKey = idempotencyKey.trim();

    if (!normalizedOrderId) throw new Error("Order ID is required");
    if (!normalizedIdempotencyKey) throw new Error("Easy Split idempotency key is required");
    if (!Array.isArray(split) || split.length === 0) throw new Error("At least one split item is required");
    for (const item of split) {
        if (!item.vendor_id?.trim()) throw new Error("Every split item requires a vendor ID");
        const percentage = item.percentage;
        const amount = item.amount;
        const hasPercentage = percentage != null;
        const hasAmount = amount != null;
        if (hasPercentage === hasAmount) {
            throw new Error("Every split item must specify exactly one of percentage or amount");
        }
        if (percentage != null && (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100)) {
            throw new Error("Split percentage must be greater than zero and at most 100");
        }
        if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
            throw new Error("Split amount must be greater than zero");
        }
    }

    const url = `${cfSplitBaseURL()}/orders/${encodeURIComponent(normalizedOrderId)}/split`;

    const body: Record<string, unknown> = { split };
    if (typeof disable_split === "boolean") {
        body.disable_split = disable_split;
    }

    const headers: Record<string, string> = {
        ...cfPgHeaders(),
        "x-api-version": "2025-01-01",
    };

    headers["x-idempotency-key"] = normalizedIdempotencyKey;

    try {
        await axios.post(url, body, {
            headers,
            httpsAgent: getFixieProxyAgent(),
            timeout: 30000,
        });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? 500;
            const responseData = error.response?.data;
            let errorMessage = error.message || `Request failed with status ${status}`;
            let responseContext: Record<string, unknown> | undefined;

            if (responseData && typeof responseData === "object" && !Array.isArray(responseData)) {
                responseContext = responseData as Record<string, unknown>;
                const message = responseContext.message ?? responseContext.status;
                if (message) errorMessage = String(message);
            }

            throw new CashfreeEasySplitAPIError(errorMessage, status, responseContext);
        }

        throw error;
    }
}
