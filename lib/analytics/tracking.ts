import { MetaStandardEvent } from "@/constants/metaPixel";
import type { StoredConsent } from "@/lib/consent";
import { trackEvent as trackMetaEvent } from "@/lib/metaPixel";

/*
 * GA4 ecommerce events for Google Tag Manager, plus the matching Meta Pixel events.
 *
 * GTM loads for every visitor under Consent Mode v2 (see GoogleTagManagerScript), so these
 * pushes always reach the dataLayer; Google's tags decide what they may store or send from
 * the consent state. Meta's helpers stay gated on marketing consent, since Meta has no
 * equivalent of Consent Mode.
 */

type DataLayerEvent = Record<string, unknown>;

declare global {
    interface Window {
        dataLayer?: DataLayerEvent[];
        gtag?: (...args: unknown[]) => void;
    }
}

export type ConsentModeState = {
    ad_storage: "granted" | "denied";
    ad_user_data: "granted" | "denied";
    ad_personalization: "granted" | "denied";
    analytics_storage: "granted" | "denied";
};

export function consentModeState(consent: Pick<StoredConsent, "analytics" | "marketing">): ConsentModeState {
    const ads = consent.marketing ? "granted" : "denied";
    return {
        ad_storage: ads,
        ad_user_data: ads,
        ad_personalization: ads,
        analytics_storage: consent.analytics ? "granted" : "denied",
    };
}

export function updateConsentMode(consent: Pick<StoredConsent, "analytics" | "marketing">) {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("consent", "update", consentModeState(consent));
}

function pushDataLayer(event: DataLayerEvent) {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
}

/** GA4 requires the previous ecommerce object to be cleared before pushing a new one. */
function pushEcommerceEvent(event: DataLayerEvent) {
    pushDataLayer({ ecommerce: null });
    pushDataLayer(event);
}

export type TrackingUser = { email?: string | null; phone?: string | null };

/** Enhanced-conversions user data: email lowercased, phone in E.164 (+91 for 10-digit numbers). */
function userData(user?: TrackingUser | null) {
    const email = user?.email?.trim().toLowerCase() || undefined;
    const digits = user?.phone?.replace(/\D/g, "") || "";
    const phone_number = digits.length === 10 ? `+91${digits}` : digits.length > 10 ? `+${digits}` : undefined;
    return email || phone_number ? { email, phone_number } : undefined;
}

export type TrackedStudio = {
    id: string;
    name: string;
    /** Studio type, e.g. "Podcast Studio". */
    category?: string | null;
    city?: string | null;
};

const studioItem = (studio: TrackedStudio) => ({
    item_id: studio.id,
    item_name: studio.name,
    ...(studio.category ? { item_category: studio.category } : {}),
    ...(studio.city ? { item_category2: studio.city } : {}),
});

const roundToPaise = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Customer clicked Confirm & Continue on the Booking Summary. `value` excludes GST. */
export function trackBeginCheckout(params: {
    studio: TrackedStudio;
    value: number;
    tax: number;
    bookingType: "instant" | "approval";
    user?: TrackingUser | null;
}) {
    const value = roundToPaise(params.value);
    pushEcommerceEvent({
        event: "begin_checkout",
        booking_type: params.bookingType,
        user_data: userData(params.user),
        ecommerce: {
            value,
            tax: roundToPaise(params.tax),
            currency: "INR",
            items: [studioItem(params.studio)],
        },
    });
    trackMetaEvent(MetaStandardEvent.InitiateCheckout, {
        value,
        currency: "INR",
        content_ids: [params.studio.id],
        content_type: "product",
        num_items: 1,
    });
}

const PURCHASE_SENT_KEY = (bookingId: string) => `cc_purchase_sent:${bookingId}`;
const purchasesSentThisPage = new Set<string>();

function purchaseAlreadySent(bookingId: string) {
    if (purchasesSentThisPage.has(bookingId)) return true;
    try {
        return window.localStorage.getItem(PURCHASE_SENT_KEY(bookingId)) === "1";
    } catch {
        return false;
    }
}

function markPurchaseSent(bookingId: string) {
    purchasesSentThisPage.add(bookingId);
    try {
        window.localStorage.setItem(PURCHASE_SENT_KEY(bookingId), "1");
    } catch {
        // Storage can be unavailable (private mode); the in-page guard still applies.
    }
}

/**
 * Paid booking confirmed. Fires at most once per booking ID in this browser, so refreshing
 * or revisiting the confirmation page doesn't count the booking again.
 * `totalPaid` includes GST; the event's `value` is the GST-exclusive amount.
 */
export function trackPurchase(params: {
    bookingId: string;
    totalPaid: number;
    gstRate: number;
    studio: TrackedStudio;
    bookingType: "instant" | "approval";
    user?: TrackingUser | null;
}) {
    if (typeof window === "undefined" || !params.bookingId || purchaseAlreadySent(params.bookingId)) return;
    markPurchaseSent(params.bookingId);

    const value = roundToPaise(params.totalPaid / (1 + params.gstRate));
    const tax = roundToPaise(params.totalPaid - value);
    pushEcommerceEvent({
        event: "purchase",
        booking_type: params.bookingType,
        user_data: userData(params.user),
        ecommerce: {
            transaction_id: params.bookingId,
            value,
            tax,
            currency: "INR",
            items: [studioItem(params.studio)],
        },
    });
    trackMetaEvent(MetaStandardEvent.Purchase, {
        value,
        currency: "INR",
        content_ids: [params.studio.id],
        content_type: "product",
        num_items: 1,
        order_id: params.bookingId,
    });
}

/** Enquiry started, e.g. a WhatsApp "Request Price" or concierge click. */
export function trackLead(params: {
    source: string;
    city?: string | null;
    shootType?: string | null;
    budgetRange?: string | null;
    studio?: TrackedStudio | null;
    user?: TrackingUser | null;
}) {
    pushDataLayer({
        event: "generate_lead",
        lead_source: params.source,
        city: params.city || params.studio?.city || undefined,
        shoot_type: params.shootType || undefined,
        budget_range: params.budgetRange || undefined,
        studio_id: params.studio?.id,
        studio_name: params.studio?.name,
        user_data: userData(params.user),
    });
    trackMetaEvent(MetaStandardEvent.Lead, {
        content_name: params.studio?.name ?? params.source,
        ...(params.studio ? { content_ids: [params.studio.id] } : {}),
    });
}
