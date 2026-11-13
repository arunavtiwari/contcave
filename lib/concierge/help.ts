/**
 * The concierge's policy and how-it-works answers. Small enough to search by
 * keyword, with no embedding call: each article is a few sentences taken from
 * the public pages it links to. When a page changes, change it here too.
 *
 * Prices and availability are never in here; those are read live by tools.
 */

export type HelpArticle = {
    id: string;
    title: string;
    body: string;
    /** Site-relative page the answer comes from, when there is one. */
    path: string | null;
    keywords: string[];
};

export const HELP_ARTICLES: HelpArticle[] = [
    {
        id: "cancellation",
        title: "Cancellation and refunds",
        body:
            "Cancel at least 72 hours before the booking for a full refund (100%). Cancel between 24 and 72 hours before for a partial refund (50%). Cancellations within 24 hours of the booking are not refunded. In exceptional circumstances such as emergencies, ContCave may review a refund request case by case and can ask for documentation. Refunds go back to the original payment method within 5–7 business days; your bank may take longer. To cancel, open My Bookings in your dashboard and use Cancel Booking; you get an email once it is processed.",
        path: "/cancellation",
        keywords: ["cancel", "cancellation", "refund", "refunds", "money back", "reschedule", "change date", "postpone", "policy"],
    },
    {
        id: "verified-vs-curated",
        title: "Verified and Curated studios",
        body:
            "Verified studios can be booked and paid for online right away. Curated studios cannot be booked online: you enquire, and ContCave confirms the details with the studio for you. A curated studio may show a price range instead of a fixed hourly price.",
        path: "/verified-vs-curated",
        keywords: ["verified", "curated", "difference", "badge", "enquire", "enquiry", "instant", "price range"],
    },
    {
        id: "how-booking-works",
        title: "How booking works",
        body:
            "Open the studio's page, choose the date, start time and number of hours, add any extras the studio offers, and pay online. Some studios confirm instantly; others approve the request first, and you are told as soon as the host responds. The exact address and a map link are sent once the booking is confirmed. Every studio has a minimum booking length, shown on its page.",
        path: null,
        keywords: ["book", "booking", "how", "process", "steps", "confirm", "approval", "approve", "instant", "address", "location", "minimum", "hours"],
    },
    {
        id: "payment-gst",
        title: "Payment and GST",
        body:
            "Payment is made online on ContCave at checkout. GST of 18% is added to the booking amount and shown before you pay, and a GST invoice is issued for the booking. Paying a studio directly, outside ContCave, is not covered by ContCave's cancellation and refund terms.",
        path: null,
        keywords: ["pay", "payment", "gst", "tax", "invoice", "bill", "upi", "card", "advance", "deposit", "cash"],
    },
    {
        id: "extra-time",
        title: "Extending a booking",
        body:
            "If the shoot runs long, you can request an extension from your booking. It depends on the studio being free after your slot and inside its opening hours, and extra time is charged at the studio's extra-hour rate.",
        path: null,
        keywords: ["extend", "extension", "extra", "overtime", "longer", "run over", "more time"],
    },
    {
        id: "list-your-studio",
        title: "Listing a studio on ContCave",
        body:
            "Studio owners can list their space from the site by choosing to list a studio and completing the details, photos, pricing and availability. Listings are reviewed before they go live. Hosts manage requests, blocked dates and payouts from their dashboard.",
        path: null,
        keywords: ["list", "host", "owner", "my studio", "onboard", "partner", "payout", "earn", "commission"],
    },
    {
        id: "support",
        title: "Reaching the ContCave team",
        body:
            "For anything about an existing booking, a payment or a problem at a studio, the ContCave team can step in. You can ask for a handover in this chat, or email info@contcave.com.",
        path: null,
        keywords: ["support", "help", "contact", "human", "agent", "person", "complaint", "issue", "problem", "call", "email"],
    },
];

const tokens = (text: string) => text.toLowerCase().match(/[a-z]{3,}/g) ?? [];

/** The best-matching articles for a question; empty when nothing matches at all. */
export function searchHelp(query: string, limit = 2): HelpArticle[] {
    const lower = query.toLowerCase();
    const words = new Set(tokens(query));
    return HELP_ARTICLES.map((article) => {
        let score = 0;
        for (const keyword of article.keywords) {
            if (keyword.includes(" ") ? lower.includes(keyword) : words.has(keyword)) score += 3;
        }
        // Shared wording only breaks ties between articles a keyword already matched;
        // on its own it would match any question that contains "the" or "what".
        if (score > 0) {
            for (const word of new Set(tokens(`${article.title} ${article.body}`))) if (words.has(word)) score += 0.2;
        }
        return { article, score };
    })
        .filter((entry) => entry.score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.article);
}
