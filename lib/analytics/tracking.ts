import { MetaStandardEvent } from "@/constants/metaPixel";
import type { StoredConsent } from "@/lib/consent";
import { generateEventId, trackEvent as trackMetaEvent, trackServerEvent as trackMetaServerEvent } from "@/lib/metaPixel";

/*
 * GA4 ecommerce events for Google Tag Manager, plus the matching Meta Pixel events.
 *
 * GTM loads for every visitor under Consent Mode v2 (the loader is in app/(main)/layout.tsx),
 * so these pushes always reach the dataLayer; Google's tags decide what they may store or send
 * from the consent state. Meta's helpers stay gated on marketing consent, since Meta has no
 * equivalent of Consent Mode. Visitors are opted in until they decline in the cookie banner.
 *
 * docs/tracking-events.md lists every event, where it fires and what it maps to.
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

export type TrackedStudio = {
    id: string;
    name: string;
    /** Studio type, e.g. "Podcast Studio". */
    category?: string | null;
    city?: string | null;
    /** Hourly rate in INR, excluding GST. */
    price?: number | null;
};

const roundToPaise = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const isPrice = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

/** One booking is one item; `price` defaults to the studio's hourly rate. */
const studioItem = (studio: TrackedStudio, price: number | null | undefined = studio.price) => ({
    item_id: studio.id,
    item_name: studio.name,
    ...(studio.category ? { item_category: studio.category } : {}),
    ...(studio.city ? { item_category2: studio.city } : {}),
    ...(isPrice(price) ? { price: roundToPaise(price) } : {}),
    quantity: 1,
});

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

export function trackPageView(pathname?: string): string | null {
    if (typeof window === "undefined") return null;
    const currentPath = pathname || window.location.pathname;
    if (isPrivateTrackingPath(currentPath)) return null;
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "page_view",
        event_id: eventId,
        ...trackingContext(currentPath),
        page_title: document.title.slice(0, 120),
    });
    return eventId;
}

export function trackStudioView(studio: TrackedStudio) {
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "view_item",
        event_id: eventId,
        ...trackingContext(),
        ecommerce: {
            currency: "INR",
            ...(isPrice(studio.price) ? { value: roundToPaise(studio.price) } : {}),
            items: [studioItem(studio)],
        },
    });
    trackMetaEvent(MetaStandardEvent.ViewContent, {
        content_ids: [studio.id],
        content_name: studio.name,
        content_type: "product",
        ...(studio.category ? { content_category: studio.category } : {}),
        ...(isPrice(studio.price) ? { value: roundToPaise(studio.price), currency: "INR" } : {}),
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
    trackMetaServerEvent(MetaStandardEvent.Contact, {
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

/** A click on an email or phone link. The address or number itself is never sent. */
export function trackContactClick(method: "email" | "phone") {
    pushTrackedEvent({
        event: "contact_click",
        event_id: generateEventId(),
        contact_method: method,
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

let lastBeginCheckoutKey: string | null = null;

/**
 * Customer began checkout from the booking flow. `value` excludes GST. Pressing Reserve again
 * for the same studio and amount doesn't start a second checkout.
 */
export function trackBeginCheckout(params: {
    studio: TrackedStudio;
    value: number;
    tax: number;
    bookingType: "instant" | "approval";
}) {
    const value = roundToPaise(params.value);
    const checkoutKey = `${params.studio.id}:${value}`;
    if (checkoutKey === lastBeginCheckoutKey) return;
    lastBeginCheckoutKey = checkoutKey;
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "begin_checkout",
        event_id: eventId,
        booking_type: params.bookingType,
        ...trackingContext(),
        ecommerce: {
            value,
            tax: roundToPaise(params.tax),
            currency: "INR",
            items: [studioItem(params.studio, value)],
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

/** Customer confirmed the booking summary and is being sent to the payment gateway. */
export function trackAddPaymentInfo(params: {
    studio: TrackedStudio;
    value: number;
    tax: number;
    bookingType: "instant" | "approval";
}) {
    const value = roundToPaise(params.value);
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "add_payment_info",
        event_id: eventId,
        booking_type: params.bookingType,
        payment_type: "cashfree",
        ...trackingContext(),
        ecommerce: {
            value,
            tax: roundToPaise(params.tax),
            currency: "INR",
            payment_type: "cashfree",
            items: [studioItem(params.studio, value)],
        },
    });
    trackMetaEvent(MetaStandardEvent.AddPaymentInfo, {
        value,
        currency: "INR",
        content_ids: [params.studio.id],
        content_type: "product",
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
    pushTrackedEvent({
        event: "purchase",
        event_id: eventId,
        booking_type: params.bookingType,
        ...trackingContext(),
        ecommerce: {
            transaction_id: params.bookingId,
            value,
            tax,
            currency: "INR",
            items: [studioItem(params.studio, value)],
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

/** Returning user signed in. Sign-ups are reported by trackSignup instead. */
export function trackLogin(method: "email" | "google") {
    pushTrackedEvent({
        event: "login",
        event_id: generateEventId(),
        method,
        ...trackingContext(),
    });
}

/** Studio search submitted from the search modal. */
export function trackSearch(params: { place?: string | null; date?: string | null; hasSets?: boolean }) {
    const eventId = generateEventId();
    const searchTerm = params.place?.slice(0, 100) || "";
    pushTrackedEvent({
        event: "search",
        event_id: eventId,
        search_term: searchTerm || "(any location)",
        ...(params.date ? { search_date: params.date } : {}),
        search_has_sets: !!params.hasSets,
        ...trackingContext(),
    });
    trackMetaEvent(MetaStandardEvent.Search, {
        ...(searchTerm ? { search_string: searchTerm } : {}),
        content_type: "product",
    }, eventId);
}

/** Studio saved to favourites. Removing a favourite is not tracked. */
export function trackAddToWishlist(studioId: string) {
    const eventId = generateEventId();
    pushTrackedEvent({
        event: "add_to_wishlist",
        event_id: eventId,
        ...trackingContext(),
        ecommerce: { currency: "INR", items: [{ item_id: studioId, quantity: 1 }] },
    });
    trackMetaEvent(MetaStandardEvent.AddToWishlist, {
        content_ids: [studioId],
        content_type: "product",
    }, eventId);
}

/** A host submitted a new studio listing: the supply-side conversion. */
export function trackListingSubmitted(params: { listingId: string; category?: string | null }) {
    const eventId = `listing:${params.listingId}`;
    pushTrackedEvent({
        event: "listing_submitted",
        event_id: eventId,
        listing_id: params.listingId,
        ...(params.category ? { listing_category: params.category } : {}),
        ...trackingContext(),
    });
    trackMetaEvent(MetaStandardEvent.SubmitApplication, {
        content_ids: [params.listingId],
        content_name: "studio_listing",
    }, eventId);
}

/** The visitor set a browsing location, and how they picked it. */
export function trackLocationSet(source: "gps" | "search" | "recent" | "popular") {
    pushDataLayer({ event: "location_set", location_source: source });
}

/** The visitor cleared the browsing location, dropping back to the recommended order. */
export function trackLocationCleared() {
    pushDataLayer({ event: "location_cleared" });
}

/** The visitor changed the feed order, e.g. "distance" or "price_asc". */
export function trackSortChanged(value: string) {
    pushDataLayer({ event: "sort_changed", sort_value: value });
}
