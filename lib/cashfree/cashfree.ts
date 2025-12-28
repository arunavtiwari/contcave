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
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    const version = process.env.CASHFREE_API_VERSION || "2023-08-01";
    
    if (!appId || !secret) {
        const missing = [];
        if (!appId) missing.push("CASHFREE_APP_ID");
        if (!secret) missing.push("CASHFREE_SECRET_KEY");
        throw new Error(`Cashfree credentials missing: ${missing.join(", ")}`);
    }
    
    if (typeof appId !== "string" || typeof secret !== "string") {
        throw new Error("Cashfree credentials must be strings");
    }
    
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
    try {
        if (!input.transaction_id || typeof input.transaction_id !== "string" || input.transaction_id.trim().length === 0) {
            throw new Error("transaction_id is required and must be a non-empty string");
        }
        
        if (!Number.isFinite(input.order_amount) || input.order_amount <= 0) {
            throw new Error("order_amount must be a positive number");
        }
        
        if (!input.customer_id || typeof input.customer_id !== "string" || input.customer_id.trim().length === 0) {
            throw new Error("customer_id is required and must be a non-empty string");
        }
        
        if (!input.customer_name || typeof input.customer_name !== "string" || input.customer_name.trim().length === 0) {
            throw new Error("customer_name is required and must be a non-empty string");
        }
        
        if (!input.customer_phone || typeof input.customer_phone !== "string" || !/^\d{10}$/.test(input.customer_phone)) {
            throw new Error("customer_phone must be a valid 10-digit phone number");
        }
        
        if (!input.return_url || typeof input.return_url !== "string" || !input.return_url.startsWith("http")) {
            throw new Error("return_url must be a valid HTTP/HTTPS URL");
        }
        
        if (!input.notify_url || typeof input.notify_url !== "string" || !input.notify_url.startsWith("http")) {
            throw new Error("notify_url must be a valid HTTP/HTTPS URL");
        }
        
        if (input.customer_email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email))) {
            throw new Error("customer_email must be a valid email address if provided");
        }
        
        const url = `${cfBaseURL()}/orders`;
        const headers = cfHeaders();
        
        const requestBody = {
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
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(requestBody),
                cache: "no-store",
                signal: controller.signal,
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === "AbortError") {
                throw new Error("Cashfree API request timeout after 30 seconds");
            }
            throw new Error(`Network error calling Cashfree API: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`);
        } finally {
            clearTimeout(timeoutId);
        }

        let responseData: unknown;
        const contentType = res.headers.get("content-type");
        const isJson = contentType?.includes("application/json");

        try {
            if (isJson) {
                responseData = await res.json();
            } else {
                const text = await res.text();
                responseData = { message: text || "Non-JSON response from Cashfree" };
            }
        } catch (parseError) {
            throw new Error(`Failed to parse Cashfree API response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
        }

        interface CashfreeOrderResponse {
            payment_session_id?: string;
            order_id?: string;
            message?: string;
            error?: string;
            subCode?: string;
            code?: string;
        }

        const j = responseData as CashfreeOrderResponse;

        if (!res.ok) {
            const statusText = res.statusText || "Unknown error";
            const errorCode = res.status;
            
            let errorMessage = "Cashfree API error";
            if (j?.message) {
                errorMessage = j.message;
            } else if (j?.error) {
                errorMessage = j.error;
            } else if (typeof j === "object" && j !== null) {
                errorMessage = JSON.stringify(j);
            }

            if (errorCode === 401 || errorCode === 403) {
                throw new Error(`Cashfree authentication failed (${errorCode}): ${errorMessage}. Please verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY are correct for ${cfEnv()} environment.`);
            }

            if (errorCode === 400) {
                throw new Error(`Cashfree validation error: ${errorMessage}`);
            }

            throw new Error(`Cashfree API error (${errorCode} ${statusText}): ${errorMessage}`);
        }

        if (!j?.payment_session_id || !j?.order_id) {
            const missing = [];
            if (!j?.payment_session_id) missing.push("payment_session_id");
            if (!j?.order_id) missing.push("order_id");
            throw new Error(`Cashfree response missing required fields: ${missing.join(", ")}. Response: ${JSON.stringify(j)}`);
        }

        return {
            payment_session_id: j.payment_session_id,
            order_id: j.order_id,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Unknown error creating Cashfree order: ${String(error)}`);
    }
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
