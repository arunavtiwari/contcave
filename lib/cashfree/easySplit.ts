import axios from "axios";

import { cfHeaders, cfSplitBaseURL } from "@/lib/cashfree/cashfree";
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
