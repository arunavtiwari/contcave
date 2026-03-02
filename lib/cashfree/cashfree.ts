import axios from "axios";
import crypto from "crypto";

import { getFixieProxyAgent } from "@/lib/fixie-proxy";

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

    if (!input.transaction_id || typeof input.transaction_id !== "string" || input.transaction_id.trim().length === 0) {
        throw new Error("transaction_id is required and must be a non-empty string");
    }

    if (!Number.isFinite(input.order_amount) || input.order_amount <= 0) {
        throw new Error("order_amount must be a positive number");
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

    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.post(url, requestBody, {
            headers,
            httpsAgent,
            timeout: 30000
        });

        const j = res.data;

        if (!j?.payment_session_id || !j?.order_id) {
            throw new Error(`Cashfree response missing required fields. Response: ${JSON.stringify(j)}`);
        }

        return {
            payment_session_id: j.payment_session_id,
            order_id: j.order_id,
        };
    } catch (error: unknown) {
        let errorMessage = "Unknown error creating Cashfree order";
        let status = 500;
        let responseData: unknown = null;

        if (axios.isAxiosError(error)) {
            status = error.response?.status || 500;
            responseData = error.response?.data;
            errorMessage = error.response?.data?.message || error.message;

            console.error(`[Cashfree CreateOrder] Error (${status}):`, JSON.stringify(responseData));

            if (status === 401 || status === 403) {
                throw new Error(`Cashfree authentication failed (${status}). Check credentials/IP Whitelist. Upstream: ${JSON.stringify(responseData)}`);
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        throw new Error(`Cashfree API Error: ${errorMessage}`);
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
    gstin?: string;
}) {
    const url = `${cfSplitBaseURL()}/vendors`;
    const httpsAgent = getFixieProxyAgent();

    const kycDetails: Record<string, string> = {
        account_type: "BUSINESS",
        business_type: "B2B",
    };
    if (payload.gstin) {
        kycDetails.gst = payload.gstin.trim().toUpperCase();
    }

    try {
        const res = await axios.post(url, {
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
            kyc_details: kycDetails,
        }, {
            headers: cfHeaders(),
            httpsAgent,
            timeout: 30000
        });

        const j = res.data;
        if (!j?.vendor_id) {
            throw new Error(j?.message || "Unable to ensure vendor");
        }
        return j.vendor_id as string;
    } catch (error: unknown) {
        let errorMessage = "Failed to ensure vendor";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree EnsureVendor] Error (${status}):`, JSON.stringify(data));

            if (status === 409) return payload.vendor_id;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}

export async function cfUpdateVendor(vendorId: string, payload: {
    name?: string;
    email?: string;
    phone?: string;
    bank?: {
        account_holder?: string;
        account_number?: string;
        ifsc?: string;
    };
    kyc_details?: {
        account_type?: string;
        business_type?: string;
        gst?: string;
    };
}) {
    const url = `${cfSplitBaseURL()}/vendors/${encodeURIComponent(vendorId)}`;
    const httpsAgent = getFixieProxyAgent();

    // Build body with only provided fields
    const body: Record<string, unknown> = {};
    if (payload.name) body.name = payload.name;
    if (payload.email) body.email = payload.email;
    if (payload.phone) body.phone = payload.phone;
    if (payload.bank) {
        body.bank = payload.bank;
        body.verify_account = true;
    }
    if (payload.kyc_details) body.kyc_details = payload.kyc_details;

    try {
        const res = await axios.patch(url, body, {
            headers: cfHeaders(),
            httpsAgent,
            timeout: 30000,
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "Failed to update vendor";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree UpdateVendor] Error (${status}):`, JSON.stringify(data));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}

/**
 * Upload GSTIN document to Cashfree vendor docs API.
 * This is required to move vendor from "Action Required" → "Active".
 */
export async function cfUploadVendorGSTIN(vendorId: string, gstin: string) {
    const url = `${cfSplitBaseURL()}/vendor-docs/${encodeURIComponent(vendorId)}`;
    const httpsAgent = getFixieProxyAgent();

    const formData = new FormData();
    formData.append("doc_type", "gstin");
    formData.append("doc_value", gstin.trim().toUpperCase());

    try {
        const { "Content-Type": _, ...authHeaders } = cfHeaders();
        const res = await axios.post(url, formData, {
            headers: {
                ...authHeaders,
                "x-api-version": "2025-01-01",
            },
            httpsAgent,
            timeout: 30000,
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "Failed to upload GSTIN document";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree UploadVendorGSTIN] Error (${status}):`, JSON.stringify(data));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}


export async function cfOnDemandTransfer(params: {
    vendor_id: string;
    amount: number;
    transfer_id: string;
    remarks?: string;
}) {
    const url = `${cfSplitBaseURL()}/settlements/on-demand-transfer`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.post(url, {
            vendor_id: params.vendor_id,
            amount: params.amount,
            transfer_id: params.transfer_id,
            remarks: params.remarks || "",
        }, {
            headers: cfHeaders(),
            httpsAgent,
            timeout: 30000
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "On-demand transfer failed";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree Transfer] Error (${status}):`, JSON.stringify(data));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}

export async function cfFetchOrder(orderId: string) {
    const url = `${cfBaseURL()}/orders/${orderId}`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.get(url, {
            headers: cfHeaders(),
            httpsAgent,
            timeout: 10000
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "Fetch order failed";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree FetchOrder] Error (${status}):`, JSON.stringify(data));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.warn(`[Cashfree FetchOrder] Failed: ${errorMessage}`);
        return null;
    }
}

export function cfMapStatus(s?: string) {
    const v = String(s || "").toUpperCase();
    if (v === "PAID" || v === "SUCCESS" || v === "CAPTURED") return "SUCCESS";
    if (v === "FAILED") return "FAILED";
    if (v === "CANCELLED" || v === "USER_DROPPED") return "CANCELLED";
    if (v === "EXPIRED") return "EXPIRED";
    return "PENDING";
}



export async function cfCreateRefund(params: {
    order_id: string;
    refund_amount: number;
    refund_id: string;
    refund_note?: string;
}) {
    const url = `${cfBaseURL()}/orders/${params.order_id}/refunds`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.post(url, {
            refund_amount: params.refund_amount,
            refund_id: params.refund_id,
            refund_note: params.refund_note,
        }, {
            headers: cfHeaders(),
            httpsAgent,
            timeout: 30000
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "Refund failed";
        let status = 500;
        let responseData: unknown = null;

        if (axios.isAxiosError(error)) {
            status = error.response?.status || 500;
            responseData = error.response?.data;
            errorMessage = error.response?.data?.message || error.message;
            console.error(`[Cashfree Refund] Error (${status}):`, JSON.stringify(responseData));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(`Cashfree Refund API Error: ${errorMessage}`);
    }
}
