import { formatINR } from "@/lib/utils";

import type { ConciergeCard, StudioCardItem, TranscriptMessage } from "./types";

type StoredRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is StoredRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const amount = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Cards saved before the shared search have `price`/`priceRange`/`locality`; this shows them with today's fields. */
function legacyEstimate(item: StoredRecord): string | null {
    const price = amount(item.price);
    if (price) return `${formatINR(price)}/hr`;
    const range = isRecord(item.priceRange) ? item.priceRange : null;
    const min = amount(range?.min);
    const max = amount(range?.max);
    return min && max ? `${formatINR(min)}–${formatINR(max)}/hr` : null;
}

function readStudio(item: unknown): StudioCardItem | null {
    if (!isRecord(item)) return null;
    const id = text(item.id);
    const title = text(item.title);
    const url = text(item.url);
    if (!id || !title || !url) return null;
    return {
        id,
        title,
        url,
        image: text(item.image),
        location: text(item.location) ?? text(item.locality) ?? "",
        estimate: text(item.estimate) ?? legacyEstimate(item),
        availability: text(item.availability) ?? "",
        rating: amount(item.rating),
        bookable: item.bookable !== false,
        fallback: item.fallback === true,
    };
}

function readCard(card: unknown): ConciergeCard | null {
    if (!isRecord(card) || typeof card.type !== "string") return null;
    if (card.type !== "studios") return card as ConciergeCard;
    const items = Array.isArray(card.items) ? card.items.map(readStudio).filter((item): item is StudioCardItem => item !== null) : [];
    const notices = Array.isArray(card.notices) ? card.notices.filter((notice): notice is string => typeof notice === "string") : [];
    return items.length ? { type: "studios", items, notices } : null;
}

/** Saved transcripts are untrusted old data: read them into the current card shapes, dropping what can't be shown. */
export function readTranscript(stored: unknown): TranscriptMessage[] {
    if (!Array.isArray(stored)) return [];
    return stored.filter(isRecord).map((message) => ({
        ...(message as TranscriptMessage),
        cards: Array.isArray(message.cards) ? message.cards.map(readCard).filter((card): card is ConciergeCard => card !== null) : [],
    }));
}
