type SplitItem = {
    vendor_id: string;
    percentage?: number;
    amount?: number;
    tags?: Record<string, string>;
};

function baseUrl() {
    const env = (process.env.CASHFREE_ENV || process.env.NEXT_PUBLIC_CASHFREE_ENV || "sandbox").toLowerCase();
    return env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

function headers(idempotencyKey?: string) {
    const id = process.env.CASHFREE_API_ID || process.env.CASHFREE_APP_ID || "";
    const secret = process.env.CASHFREE_API_SECRET || process.env.CASHFREE_SECRET_KEY || "";
    if (!id || !secret) throw new Error("Cashfree API credentials missing");
    const h: Record<string, string> = {
        "Content-Type": "application/json",
        "x-client-id": id,
        "x-client-secret": secret,
        "x-api-version": "2025-01-01"
    };
    if (idempotencyKey) h["x-idempotency-key"] = idempotencyKey;
    return h;
}

export async function createOrderSplit(input: {
    orderId: string;
    split: SplitItem[];
    idempotencyKey: string;
    disable_split?: boolean;
}) {
    const res = await fetch(`${baseUrl()}/easy-split/orders/${encodeURIComponent(input.orderId)}/split`, {
        method: "POST",
        headers: headers(input.idempotencyKey),
        body: JSON.stringify({
            split: input.split,
            ...(typeof input.disable_split === "boolean" ? { disable_split: input.disable_split } : {}),
        }),
    });

    if (!res.ok) {
        let msg = `cashfree split error ${res.status}`;
        try {
            const j = await res.json();
            msg = j?.message || j?.status || msg;
        } catch { }
        throw new Error(msg);
    }
}
