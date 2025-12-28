import crypto from "crypto";

type CFEnv = "SANDBOX" | "PRODUCTION";

export function cfEnv(): CFEnv {
    const v = (process.env.CASHFREE_ENV || "SANDBOX").toUpperCase();
    return v === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
}

export function cfBaseURL() {
    return cfEnv() === "PRODUCTION"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
}

export function cfSplitBaseURL() {
    return cfBaseURL() + "/easy-split";
}

export function cfHeaders(): Record<string, string> {
    const appId = process.env.CASHFREE_APP_ID!;
    const secret = process.env.CASHFREE_SECRET_KEY!;
    const version = process.env.CASHFREE_API_VERSION || "2023-08-01";
    if (!appId || !secret) throw new Error("CASHFREE_APP_ID / CASHFREE_SECRET_KEY missing");
    return {
        "x-client-id": appId,
        "x-client-secret": secret,
        "x-api-version": version,
        "Content-Type": "application/json",
    };
}

export async function cfCreateOrder(input: {
    transaction_id: string;
    order_amount: number;
    customer_id: string;
    return_url: string;
    notify_url: string;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
}): Promise<{ payment_session_id: string; order_id: string }> {
    const url = `${cfBaseURL()}/orders`;
    const res = await fetch(url, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
            transaction_id: input.transaction_id,
            order_amount: input.order_amount,
            order_currency: "INR",
            customer_details: {
                customer_id: input.customer_id,
                customer_name: input.customer_name,
                customer_email: input.customer_email,
                customer_phone: input.customer_phone,
            },
            order_meta: {
                return_url: input.return_url.replace("{transaction_id}", input.transaction_id),
                notify_url: input.notify_url,
            },
        }),
        cache: "no-store",
    });

    interface CashfreeOrderResponse {
        payment_session_id?: string;
        order_id?: string;
        message?: string;
        error?: string;
    }

    const j: CashfreeOrderResponse = await res.json().catch(() => ({}));
    if (!res.ok || !j?.payment_session_id || !j?.order_id) {
        throw new Error(
            j?.message || j?.error || JSON.stringify(j) || "Cashfree create order failed"
        );
    }

    return {
        payment_session_id: j.payment_session_id,
        order_id: j.order_id,
    };
}

export function cfVerifyWebhookSignature({
    rawBody,
    timestamp,
    signatureBase64,
}: {
    rawBody: string;
    timestamp: string;
    signatureBase64: string;
}) {
    const secret = process.env.CASHFREE_SECRET_KEY!;
    const h = crypto.createHmac("sha256", secret);
    h.update(timestamp + rawBody);
    const computed = h.digest("base64");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureBase64));
}

export async function cfEnsureVendor(payload: {
    vendor_id: string;
    display_name: string;
    email?: string;
    phone?: string;
    account_holder: string;
    account_number: string;
    ifsc: string;
}) {
    const url = `${cfSplitBaseURL()}/vendors`;
    const res = await fetch(url, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
            vendor_id: payload.vendor_id,
            display_name: payload.display_name,
            email: payload.email,
            phone: payload.phone,
            settlements: { schedule_option: "ONDEMAND" },
            bank: {
                account_holder: payload.account_holder,
                account_number: payload.account_number,
                ifsc: payload.ifsc,
            },
        }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.vendor_id) {
        throw new Error(j?.message || "Unable to ensure vendor");
    }
    return j.vendor_id as string;
}

export async function cfOnDemandTransfer(params: {
    vendor_id: string;
    amount: number;
    transfer_id: string;
    remarks?: string;
}) {
    const url = `${cfSplitBaseURL()}/settlements/on-demand-transfer`;
    const res = await fetch(url, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
            vendor_id: params.vendor_id,
            amount: params.amount,
            transfer_id: params.transfer_id,
            remarks: params.remarks || "",
        }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.message || "On-demand transfer failed");
    return j;
}
