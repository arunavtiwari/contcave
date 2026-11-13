import "server-only";

import prisma from "@/lib/prismadb";

import { isBriefEmpty } from "./brief";
import type { ConversationState } from "./store";
import type { ConciergeBrief, ConciergeCard } from "./types";

/**
 * The link to ContCave's ops CRM (the contcave-crm app). The concierge is a
 * service user there: it calls the CRM's own HTTP routes with a bearer token,
 * so every stage change goes through the CRM's workflow rules and nothing is
 * written to its database directly.
 *
 * Off unless both CRM_BASE_URL and CRM_SERVICE_TOKEN are set. Every call is
 * best-effort and runs after the reply has been sent: the CRM being down must
 * never slow or break a customer's chat.
 */

const baseUrl = () => process.env.CRM_BASE_URL?.replace(/\/+$/, "") ?? "";
const token = () => process.env.CRM_SERVICE_TOKEN ?? "";

export const crmEnabled = () => Boolean(baseUrl() && token());

async function crm<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T | null> {
    try {
        const response = await fetch(`${baseUrl()}${path}`, {
            method,
            headers: { Authorization: `Bearer ${token()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(8_000),
            cache: "no-store",
        });
        if (!response.ok) {
            console.error(`[concierge:crm] ${method} ${path} -> ${response.status}`);
            return null;
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error(`[concierge:crm] ${method} ${path} failed`, error instanceof Error ? error.message : error);
        return null;
    }
}

type Doc = { data?: { id?: string } };

/** The CRM's shoot types (its enums.ts); anything else is "other". */
function crmShootType(brief: ConciergeBrief): string | null {
    const text = (brief.shootType ?? "").toLowerCase();
    if (!text) return null;
    if (/product|e-?com|catalog|skincare|food/.test(text)) return "product";
    if (/fashion|lookbook|apparel/.test(text)) return "fashion";
    if (/campaign|brand/.test(text)) return "campaign";
    if (/ugc|reel|content/.test(text)) return "ugc";
    if (/podcast|interview/.test(text)) return "podcast";
    if (/video|film/.test(text)) return "video";
    if (/event|party|workshop/.test(text)) return "event";
    return "other";
}

/** Everything the concierge extracted is a reading of chat text, so it is filed as inferred for a person to confirm. */
const inferred = (brief: ConciergeBrief) => {
    const evidence = { evidence: "inferred", confirmedBy: null, confirmedAt: null };
    const fields: Record<string, typeof evidence> = {};
    if (brief.shootType) fields["brief.shootType"] = evidence;
    if (brief.city) fields["brief.city"] = evidence;
    if (brief.budgetPerHour || brief.budgetTotal) fields["brief.budgetMax"] = evidence;
    if (brief.hours) fields["brief.durationHours"] = evidence;
    if (brief.people) fields["brief.crewSize"] = evidence;
    return fields;
};

export type CrmUser = { id: string; name: string | null; email: string | null; phone: string | null };

/**
 * Bring the CRM up to date with a conversation after a turn: make sure the
 * contact and the enquiry exist, record a shortlist as "options sent", and
 * pass a handover on. Safe to call on every turn; it only does what is new.
 */
export async function syncToCrm(params: {
    state: ConversationState;
    user: CrmUser | null;
    cards: ConciergeCard[];
    handedOff: string | null;
    siteUrl: string;
}): Promise<void> {
    if (!crmEnabled()) return;
    const { state, user } = params;
    // An empty brief is a greeting, not a lead.
    if (isBriefEmpty(state.brief) && !params.handedOff) return;
    const ref = state.id.slice(-6);
    const changed: { crmContactId?: string; crmEnquiryId?: string } = {};

    // The sync runs after the reply, so the next turn may already have loaded this conversation
    // before the ids were saved. Read them fresh, and if they are still missing ask the CRM whether
    // this conversation already has an enquiry, so a second contact is never created for it.
    const saved = await prisma.conciergeConversation
        .findUnique({ where: { id: state.id }, select: { crmContactId: true, crmEnquiryId: true } })
        .catch(() => null);
    state.crmContactId = saved?.crmContactId ?? state.crmContactId;
    state.crmEnquiryId = saved?.crmEnquiryId ?? state.crmEnquiryId;
    if (!state.crmEnquiryId) {
        const existing = await crm<{ data?: { id: string; contactId?: string | null }[] }>("GET", `/api/enquiries?conversationId=${encodeURIComponent(state.id)}&limit=1`);
        const enquiry = existing?.data?.[0];
        if (enquiry) {
            state.crmEnquiryId = changed.crmEnquiryId = enquiry.id;
            if (enquiry.contactId && !state.crmContactId) state.crmContactId = changed.crmContactId = enquiry.contactId;
        }
    }

    if (!state.crmContactId) {
        const contact = await crm<Doc>("POST", "/api/contacts", {
            name: user?.name?.trim() || `Website visitor ${ref}`,
            ...(user?.phone ? { phone: user.phone } : {}),
            ...(user?.email ? { email: user.email } : {}),
            ...(user ? { platformUserId: user.id } : {}),
        });
        if (!contact?.data?.id) return;
        state.crmContactId = changed.crmContactId = contact.data.id;
    }

    if (!state.crmEnquiryId) {
        const brief = state.brief;
        const firstMessage = state.transcript.find((message) => message.role === "user")?.text ?? "";
        const enquiry = await crm<Doc>("POST", "/api/enquiries", {
            contactId: state.crmContactId,
            source: "website",
            sourceDetail: "AI concierge",
            enquiryDate: new Date().toISOString(),
            // One enquiry per conversation: a retry returns the first one.
            conversation: { channel: "web", id: state.id },
            brief: {
                rawText: firstMessage.slice(0, 1000),
                shootType: crmShootType(brief),
                city: brief.city ?? null,
                preferredDates: brief.date ? [brief.date] : [],
                datesFlexible: !brief.date,
                durationHours: brief.hours ?? null,
                crewSize: brief.people ?? null,
                budgetMax: brief.budgetTotal ?? (brief.budgetPerHour && brief.hours ? brief.budgetPerHour * brief.hours : null),
                requirements: [...(brief.aesthetics ?? []), ...(brief.notes ? [brief.notes] : [])].slice(0, 10),
                fieldEvidence: inferred(brief),
            },
        });
        if (enquiry?.data?.id) state.crmEnquiryId = changed.crmEnquiryId = enquiry.data.id;
    }

    if (Object.keys(changed).length > 0) {
        await prisma.conciergeConversation.update({ where: { id: state.id }, data: changed }).catch(() => undefined);
    }
    if (!state.crmEnquiryId) return;
    const enquiryPath = `/api/enquiries/${state.crmEnquiryId}`;

    // A shortlist or a booking link is the CRM's "options sent": add the studios it knows, then move the stage.
    const offered = params.cards.flatMap((card) =>
        card.type === "studios" ? [] : card.type === "quote" || card.type === "book" ? [{ id: card.studio.id, quote: card.type === "quote" ? card.total : null }] : []
    );
    const shortlisted = params.cards.some((card) => card.type === "shortlist");
    if (offered.length > 0 || shortlisted) {
        let added = 0;
        // A studio is offered once per enquiry: a second quote for it updates the amount on the entry it already has.
        const current = await crm<{ data?: { shortlist?: { id: string; studioId: string; quotedAmount?: number | null }[] } }>("GET", enquiryPath);
        const onShortlist = new Map((current?.data?.shortlist ?? []).map((entry) => [entry.studioId, entry]));
        for (const offer of offered) {
            const match = await crm<{ data?: { id: string }[] }>("GET", `/api/studios?platformStudioId=${encodeURIComponent(offer.id)}&limit=1`);
            const studioId = match?.data?.[0]?.id;
            if (!studioId) continue;
            const existing = onShortlist.get(studioId);
            if (existing) {
                if (offer.quote !== null && offer.quote !== existing.quotedAmount) {
                    await crm("PATCH", `${enquiryPath}/shortlist/${existing.id}`, { quotedAmount: offer.quote });
                }
                continue;
            }
            const entry = await crm<{ data?: { shortlist?: { id: string; studioId: string }[] } }>("POST", `${enquiryPath}/shortlist`, { studioId, quotedAmount: offer.quote });
            if (entry) {
                added += 1;
                const created = entry.data?.shortlist?.find((item) => item.studioId === studioId);
                if (created) onShortlist.set(studioId, created);
            }
        }
        // Only a new offer moves the stage; repeating a quote for a studio already offered does not.
        if (added > 0 || (shortlisted && onShortlist.size > 0)) {
            const note = shortlisted ? "Shortlist link shared by the concierge" : "Quote shown by the concierge";
            const moved = await crm("POST", `${enquiryPath}/options-sent`, { note });
            // The CRM will not move a lead out of New until there is a way to reach the person, and an
            // anonymous website visitor has left no phone number. Put it on the timeline instead, so the
            // team still sees what was offered.
            if (!moved) {
                await crm("POST", "/api/activities", {
                    entityType: "enquiry",
                    entityId: state.crmEnquiryId,
                    type: "note",
                    direction: "out",
                    body: `${note}. Stage not moved: the visitor has not left a phone number yet.`,
                });
            }
        }
    }

    if (params.handedOff) {
        await crm("POST", `${enquiryPath}/handoff`, { reason: params.handedOff.slice(0, 200) });
    }
}
