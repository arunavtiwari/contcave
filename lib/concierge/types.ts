/**
 * Shapes shared by the concierge server (lib/concierge) and its chat UI
 * (components/concierge). Client-safe: types and plain constants only.
 */

export const CONCIERGE_NAME = "Spot";

/** What we know about the shoot so far. Every field is optional and filled in as the customer says it. */
export type ConciergeBrief = {
    city?: string;
    /** YYYY-MM-DD */
    date?: string;
    shootType?: string;
    hours?: number;
    people?: number;
    /** Whole-shoot budget in rupees. */
    budgetTotal?: number;
    /** Studio budget per hour in rupees. */
    budgetPerHour?: number;
    aesthetics?: string[];
    notes?: string;
};

/** One search result as the search box shows it; every field comes from lib/search's ResultView. */
export type StudioCardItem = {
    id: string;
    title: string;
    url: string;
    image: string | null;
    location: string;
    /** The box's price line, e.g. "₹2,500/hr" or a package total. */
    estimate: string | null;
    availability: string;
    rating: number | null;
    /** Verified studios can be booked and paid for online; curated ones are enquiry-only. */
    bookable: boolean;
    /** Shown as a closest alternative, not a full match. */
    fallback: boolean;
};

export type StudioRef = { id: string; title: string; url: string };

export type ConciergeCard =
    | { type: "studios"; items: StudioCardItem[]; notices: string[] }
    | {
          type: "availability";
          studio: StudioRef;
          date: string;
          /** e.g. "9:00 AM – 9:00 PM"; null when the studio is closed that day. */
          openHours: string | null;
          windows: { from: string; to: string }[];
          minimumHours: number;
          closedReason: string | null;
      }
    | {
          type: "quote";
          studio: StudioRef;
          date: string;
          from: string;
          to: string;
          hours: number;
          lines: { label: string; amount: number }[];
          gst: number;
          total: number;
          note: string | null;
      }
    | {
          type: "plan";
          title: string;
          schedule: { time: string; what: string }[];
          shots: string[];
          checklist: string[];
          budget: { label: string; amount: number }[];
          budgetTotal: number | null;
      }
    | { type: "book"; studio: StudioRef; date: string | null; from: string | null; to: string | null }
    | { type: "shortlist"; url: string; count: number }
    | { type: "handoff"; url: string; reason: string };

export type TranscriptMessage = {
    id: string;
    role: "user" | "assistant";
    text: string;
    cards: ConciergeCard[];
    at: string;
};

/** One line of the chat endpoint's newline-delimited JSON stream. */
export type ConciergeEvent =
    | { type: "start"; conversationId: string }
    | { type: "status"; text: string }
    | { type: "text"; delta: string }
    /** The reply failed a guardrail after streaming: show this text in place of what was streamed. */
    | { type: "replace"; text: string }
    | { type: "card"; card: ConciergeCard }
    | { type: "brief"; brief: ConciergeBrief }
    | { type: "suggestions"; items: string[] }
    | { type: "done"; message: TranscriptMessage; handedOff: boolean }
    | { type: "error"; message: string };

export const MAX_USER_MESSAGE_LENGTH = 1200;
