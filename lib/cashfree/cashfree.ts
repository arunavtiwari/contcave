import "server-only";

import axios from "axios";
import crypto from "crypto";
import { formatInTimeZone } from "date-fns-tz";

import { isE2eEffectDisabled } from "@/lib/e2e-guards";
import { getFixieProxyAgent } from "@/lib/fixie-proxy";

type CFEnv = "SANDBOX" | "PRODUCTION";
const CASHFREE_VENDOR_TIMEOUT_MS = 30_000;

export class CashfreeVendorNotFoundError extends Error {
    constructor() {
        super("Cashfree vendor does not exist");
        this.name = "CashfreeVendorNotFoundError";
    }
}

export function cfEnv(): CFEnv {
    const v = (process.env.CASHFREE_ENV || "SANDBOX").toUpperCase();
    return v === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
}

export function cfBaseURL() {
    return cfEnv() === "PRODUCTION"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
}

export function cfVerificationBaseURL() {
    return cfEnv() === "PRODUCTION"
        ? "https://api.cashfree.com/verification"
        : "https://sandbox.cashfree.com/verification";
}

export function cfSplitBaseURL() {
    return cfBaseURL() + "/easy-split";
}

function cfApiV2BaseURL() {
    return cfEnv() === "PRODUCTION"
        ? "https://api.cashfree.com/api/v2"
        : "https://test.cashfree.com/api/v2";
}

export function cfPgHeaders(): Record<string, string> {
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

export function cfSecureIdHeaders(apiVersion: string): Record<string, string> {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        const missing = [
            !clientId ? "CASHFREE_CLIENT_ID" : null,
            !clientSecret ? "CASHFREE_CLIENT_SECRET" : null,
        ].filter(Boolean);
        throw new Error(`Cashfree Secure ID credentials missing: ${missing.join(", ")}`);
    }

    return {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": apiVersion,
    };
}

function sanitizeVendorName(value: string, fallback: string) {
    const cleaned = value
        .trim()
        .replace(/[^a-zA-Z0-9 ./&-]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 100)
        .trim();
    return cleaned || fallback;
}

function vendorTimeoutController() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CASHFREE_VENDOR_TIMEOUT_MS);
    return { controller, timeoutId };
}

function isAbortOrTimeout(error: unknown) {
    return (
        error instanceof Error && error.name === "AbortError"
    ) || (
        axios.isAxiosError(error) && (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED")
    );
}





export async function cfCreateOrder(input: {
    transaction_id: string;
    order_amount: number;
    customer_id: string;
    return_url: string;
    notify_url?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
    expires_at?: Date;
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
    if (input.expires_at && (!Number.isFinite(input.expires_at.getTime()) || input.expires_at.getTime() <= Date.now())) {
        throw new Error("expires_at must be a future date");
    }

    const url = `${cfBaseURL()}/orders`;
    const headers = cfPgHeaders();

    const requestBody = {
        order_id: input.transaction_id,
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
        ...(input.expires_at ? { order_expiry_time: input.expires_at.toISOString() } : {}),
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
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!secret) return false;
    const h = crypto.createHmac("sha256", secret);
    h.update(timestamp + rawBody);
    const computedBuffer = h.digest();
    const providedBuffer = Buffer.from(signatureBase64, "base64");

    if (computedBuffer.length !== providedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(computedBuffer, providedBuffer);
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
    const accountNumber = payload.account_number.replace(/\D/g, "");
    const ifsc = payload.ifsc.trim().toUpperCase();
    const email = payload.email?.trim().toLowerCase();
    const phone = payload.phone?.replace(/\D/g, "").slice(-10);
    const verifyAccount = process.env.CASHFREE_VERIFY_VENDOR_ACCOUNT === "true";

    if (!payload.vendor_id.trim()) throw new Error("Vendor ID is required");
    if (!email) throw new Error("Vendor email is required");
    if (!phone || phone.length !== 10) throw new Error("Vendor phone number must be a valid 10-digit number");
    if (!/^\d{9,20}$/.test(accountNumber)) throw new Error("Vendor account number must be between 9 and 20 digits");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new Error("Vendor IFSC code is invalid");

    const kycDetails: Record<string, string> = {
        account_type: payload.gstin ? "BUSINESS" : "INDIVIDUAL",
        business_type: payload.gstin ? "B2B" : "Miscellaneous",
    };
    if (payload.gstin) {
        kycDetails.gst = payload.gstin.trim().toUpperCase();
    }

    const { controller, timeoutId } = vendorTimeoutController();
    try {
        const res = await axios.post(url, {
            vendor_id: payload.vendor_id.trim(),
            name: sanitizeVendorName(payload.display_name, "Vendor"),
            status: "ACTIVE",
            email,
            phone,
            schedule_option: Number(process.env.CASHFREE_VENDOR_SCHEDULE_OPTION ?? 2),
            bank: {
                account_holder: sanitizeVendorName(payload.account_holder, "Account Holder"),
                account_number: accountNumber,
                ifsc,
            },
            verify_account: verifyAccount,
            dashboard_access: false,
            kyc_details: kycDetails,
        }, {
            headers: cfPgHeaders(),
            httpsAgent,
            signal: controller.signal,
            timeout: CASHFREE_VENDOR_TIMEOUT_MS
        });

        const j = res.data;
        if (!j?.vendor_id) {
            throw new Error(j?.message || "Unable to ensure vendor");
        }
        return j.vendor_id as string;
    } catch (error: unknown) {
        if (isAbortOrTimeout(error)) {
            throw new Error("Cashfree vendor creation timed out. Please try again.");
        }

        let errorMessage = "Failed to ensure vendor";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree EnsureVendor] Error (${status}):`, JSON.stringify(data));

            if (status === 409) {
                await cfUpdateVendor(payload.vendor_id.trim(), {
                    name: sanitizeVendorName(payload.display_name, "Vendor"),
                    email,
                    phone,
                    bank: {
                        account_holder: sanitizeVendorName(payload.account_holder, "Account Holder"),
                        account_number: accountNumber,
                        ifsc,
                    },
                    kyc_details: kycDetails,
                });
                return payload.vendor_id;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    } finally {
        clearTimeout(timeoutId);
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

    const body: Record<string, unknown> = {};
    if (payload.name) body.name = payload.name;
    if (payload.email) body.email = payload.email;
    if (payload.phone) body.phone = payload.phone;
    if (payload.bank) {
        body.bank = payload.bank;
        body.verify_account = process.env.CASHFREE_VERIFY_VENDOR_ACCOUNT === "true";
    }
    if (payload.kyc_details) body.kyc_details = payload.kyc_details;

    try {
        const res = await axios.patch(url, body, {
            headers: cfPgHeaders(),
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
            if (status === 400 && /vendor does not exist/i.test(String(data?.message || ""))) {
                throw new CashfreeVendorNotFoundError();
            }
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
    const vendorId = params.vendor_id.trim();
    const transferId = params.transfer_id.trim();
    if (!vendorId) throw new Error("Vendor ID is required");
    if (!transferId) throw new Error("Transfer ID is required");
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
        throw new Error("Transfer amount must be greater than zero");
    }

    const url = `${cfSplitBaseURL()}/vendors/${encodeURIComponent(vendorId)}/transfer`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.post(url, {
            transfer_from: "MERCHANT",
            transfer_type: "ON_DEMAND",
            transfer_amount: params.amount,
            remark: params.remarks || "",
            tags: {
                transfer_id: transferId,
            },
        }, {
            headers: {
                ...cfPgHeaders(),
                "x-idempotency-key": transferId,
            },
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

export async function cfSetVendorSettlementEligibilityDate(params: {
    orderId: string;
    vendorId: string;
    settlementEligibilityDate: Date;
}) {
    const orderId = params.orderId.trim();
    const vendorId = params.vendorId.trim();
    if (!orderId) throw new Error("Order ID is required");
    if (!vendorId) throw new Error("Vendor ID is required");
    if (!Number.isFinite(params.settlementEligibilityDate.getTime())) {
        throw new Error("Settlement eligibility date is invalid");
    }

    const url = `${cfApiV2BaseURL()}/easy-split/orders/${encodeURIComponent(orderId)}/settlement-eligibility/vendors/${encodeURIComponent(vendorId)}`;
    const httpsAgent = getFixieProxyAgent();
    const settlementEligibilityDateUpdate = formatInTimeZone(
        params.settlementEligibilityDate,
        "Asia/Kolkata",
        "yyyy-MM-dd HH:mm:ss",
    );

    try {
        const res = await axios.put(url, {
            settlementEligibilityDateUpdate,
        }, {
            headers: cfPgHeaders(),
            httpsAgent,
            timeout: 30000
        });

        return res.data;
    } catch (error: unknown) {
        let errorMessage = "Settlement eligibility update failed";
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            errorMessage = data?.message || error.message;
            console.error(`[Cashfree SettlementEligibility] Error (${status}):`, JSON.stringify(data));
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}

export async function cfFetchOrder(orderId: string) {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) throw new Error("Order ID is required");
    const url = `${cfBaseURL()}/orders/${encodeURIComponent(normalizedOrderId)}`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.get(url, {
            headers: cfPgHeaders(),
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
    const orderId = params.order_id.trim();
    const refundId = params.refund_id.trim();
    if (!orderId) throw new Error("Order ID is required");
    if (!refundId) throw new Error("Refund ID is required");
    if (!Number.isFinite(params.refund_amount) || params.refund_amount <= 0) {
        throw new Error("Refund amount must be greater than zero");
    }

    if (isE2eEffectDisabled("E2E_DISABLE_CASHFREE_REFUND")) {
        return {
            refund_id: params.refund_id,
            order_id: params.order_id,
            refund_amount: params.refund_amount,
            status: "SIMULATED",
        };
    }

    const url = `${cfBaseURL()}/orders/${encodeURIComponent(orderId)}/refunds`;
    const httpsAgent = getFixieProxyAgent();

    try {
        const res = await axios.post(url, {
            refund_amount: params.refund_amount,
            refund_id: refundId,
            refund_note: params.refund_note,
        }, {
            headers: cfPgHeaders(),
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
