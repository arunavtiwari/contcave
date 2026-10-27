import { MetaStandardEvent } from "@/constants/metaPixel";
import type { StoredConsent } from "@/lib/consent";
import { generateEventId, trackEvent as trackMetaEvent } from "@/lib/metaPixel";

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

/** Clear the prior ecommerce object on every event to prevent stale item/value data leaking forward. */
function pushTrackedEvent(event: DataLayerEvent) {
    pushDataLayer({ ecommerce: null });
    pushDataLayer(event);
}

/** GA4 requires the previous ecommerce object to be cleared before pushing a new one. */
function pushEcommerceEvent(event: DataLayerEvent) {
    pushTrackedEvent(event);
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

function pageType(pathname: string) {
    if (pathname === "/") return "home";
    if (/^\/studio\//.test(pathname) || /^\/listings?\//.test(pathname)) return "studio";
    if (/^\/studios(?:\/|$)/.test(pathname)) return "listing";
    return "content";
}

function safeTrackedPath(pathname: string) {
    if (/^\/(dashboard|admin|pay|payments|api|auth)(?:\/|$)/.test(pathname)) {
        return `/${pathname.split("/")[1]}`;
    }
    return pathname.slice(0, 160) || "/";
}

function trackingContext(pathname = typeof window === "undefined" ? "/" : window.location.pathname) {
    const path = safeTrackedPath(pathname);
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return {
        page_type: pageType(pathname),
        page_path: path,
        ...(origin ? { page_location: `${origin}${path}` } : {}),
    };
}

function isPrivateTrackingPath(pathname: string) {
    return /^\/(dashboard|admin|pay|payments|api|auth)(?:\/|$)/.test(pathname);
}

export function trackPageView(pathname?: string) {
    if (typeof window === "undefined") return;
    const currentPath = pathname || window.location.pathname;
    if (isPrivateTrackingPath(currentPath)) return;
    pushTrackedEvent({
        event: "page_view",
        event_id: generateEventId(),
        ...trackingContext(currentPath),
        page_title: document.title.slice(0, 120),
    });
}

export function trackStudioView(studio: TrackedStudio) {
    const eventId = generateEventId();
    pushEcommerceEvent({
        event: "view_item",
        event_id: eventId,
        ...trackingContext(),
        ecommerce: { currency: "INR", items: [studioItem(studio)] },
    });
    trackMetaEvent(MetaStandardEvent.ViewContent, {
        content_ids: [studio.id],
        content_name: studio.name,
        content_type: "product",
        ...(studio.category ? { content_category: studio.category } : {}),
    }, eventId);
}

export function trackDateSelection(studio?: TrackedStudio | null) {
    pushTrackedEvent({
        event: "select_date",
        event_id: generateEventId(),
        ...trackingContext(),
        ...(studio ? { ecommerce: { currency: "INR", items: [studioItem(studio)] } } : {}),
    });
}

export function trackTimeSelection(studio?: TrackedStudio | null) {
    pushTrackedEvent({
        event: "select_time",
        event_id: generateEventId(),
        ...trackingContext(),
        ...(studio ? { ecommerce: { currency: "INR", items: [studioItem(studio)] } } : {}),
    });
}

export function trackCheckoutStep(params: { step: "personal_details" | "review_booking"; studio?: TrackedStudio | null }) {
    pushTrackedEvent({
        event: "checkout_step",
        event_id: generateEventId(),
        step_name: params.step,
        ...trackingContext(),
        ...(params.studio ? { ecommerce: { currency: "INR", items: [studioItem(params.studio)] } } : {}),
    });
}

export function trackWhatsAppContact(params: { source?: string; studio?: TrackedStudio | null } = {}) {
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "whatsapp_contact",
        event_id: eventId,
        contact_method: "whatsapp",
        contact_source: params.source || "whatsapp_link",
        ...trackingContext(),
        ...(params.studio ? { ecommerce: { currency: "INR", items: [studioItem(params.studio)] } } : {}),
    });
    trackMetaEvent(MetaStandardEvent.Contact, {
        content_type: "product",
        ...(params.studio ? { content_ids: [params.studio.id], content_name: params.studio.name } : {}),
    }, eventId);
}

export function trackOutboundLinkClick(hostname: string, opensNewTab: boolean) {
    pushTrackedEvent({
        event: "outbound_link_click",
        event_id: generateEventId(),
        outbound_host: hostname.slice(0, 120).toLowerCase(),
        opens_new_tab: opensNewTab,
        ...trackingContext(),
    });
}

export function trackNewTabLinkClick(pathname: string) {
    if (isPrivateTrackingPath(pathname)) return;
    pushTrackedEvent({
        event: "new_tab_link_click",
        event_id: generateEventId(),
        destination_path: safeTrackedPath(pathname),
        ...trackingContext(),
    });
}

/** Customer began checkout from the booking flow. `value` excludes GST. */
export function trackBeginCheckout(params: {
    studio: TrackedStudio;
    value: number;
    tax: number;
    bookingType: "instant" | "approval";
}) {
    const value = roundToPaise(params.value);
    const eventId = generateEventId();
    pushEcommerceEvent({
        event: "begin_checkout",
        event_id: eventId,
        booking_type: params.bookingType,
        ...trackingContext(),
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
    }, eventId);
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
}) {
    if (typeof window === "undefined" || !params.bookingId || purchaseAlreadySent(params.bookingId)) return;
    markPurchaseSent(params.bookingId);

    const value = roundToPaise(params.totalPaid / (1 + params.gstRate));
    const tax = roundToPaise(params.totalPaid - value);
    const eventId = `purchase:${params.bookingId}`;
    pushEcommerceEvent({
        event: "purchase",
        event_id: eventId,
        booking_type: params.bookingType,
        ...trackingContext(),
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
    }, eventId);
}

/** Successful customer or owner registration; never pass email or phone to analytics. */
const SIGNUP_SENT_KEY = (eventId: string) => `cc_signup_sent:${eventId}`;

function signupAlreadySent(eventId: string) {
    try {
        return window.localStorage.getItem(SIGNUP_SENT_KEY(eventId)) === "1";
    } catch {
        return false;
    }
}

function markSignupSent(eventId: string) {
    try {
        window.localStorage.setItem(SIGNUP_SENT_KEY(eventId), "1");
    } catch {
        // Tracking still works when browser storage is unavailable.
    }
}

export function trackSignup(params: {
    method: "email" | "google";
    accountType?: "customer" | "owner";
    eventId?: string;
}) {
    if (typeof window === "undefined") return;
    const eventId = params.eventId || generateEventId();
    if (signupAlreadySent(eventId)) return;
    markSignupSent(eventId);

    pushTrackedEvent({
        event: "sign_up",
        event_id: eventId,
        method: params.method,
        ...(params.accountType ? { account_type: params.accountType } : {}),
        ...trackingContext(),
    });
    trackMetaEvent(MetaStandardEvent.CompleteRegistration, {
        ...(params.accountType ? { content_name: params.accountType } : {}),
        status: "complete",
    }, eventId);
}

export function trackLead(params: {
    source: string;
    city?: string | null;
    shootType?: string | null;
    budgetRange?: string | null;
    studio?: TrackedStudio | null;
}) {
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "generate_lead",
        event_id: eventId,
        lead_source: params.source,
        city: params.city || params.studio?.city || undefined,
        shoot_type: params.shootType || undefined,
        budget_range: params.budgetRange || undefined,
        studio_id: params.studio?.id,
        studio_name: params.studio?.name,
        ...trackingContext(),
    });
    trackMetaEvent(MetaStandardEvent.Lead, {
        content_name: params.studio?.name ?? params.source,
        ...(params.studio ? { content_ids: [params.studio.id] } : {}),
    }, eventId);
}
