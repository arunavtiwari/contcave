"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IoLogoWhatsapp } from "react-icons/io";
import {
    LuArrowUpRight,
    LuBadgeCheck,
    LuCalendarDays,
    LuCheck,
    LuChevronDown,
    LuClock,
    LuCopy,
    LuLightbulb,
    LuMapPin,
    LuMaximize2,
    LuStar,
    LuUsers,
} from "react-icons/lu";

import type { ConciergeCard, StudioCardItem } from "@/lib/concierge/types";
import { cn } from "@/lib/utils";

type Props = {
    card: ConciergeCard;
    /** Send a follow-up on the customer's behalf (card buttons). */
    onAsk: (text: string) => void;
    disabled: boolean;
};

const inr = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`;

/** "Sat, 14 Dec" from a YYYY-MM-DD key, without shifting across time zones. */
export const prettyDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const shell = "overflow-hidden rounded-[20px] border border-border bg-background";
const eyebrow = "text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground";
const chipButton =
    "inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:pointer-events-none disabled:opacity-50";
const primaryButton =
    "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2";

// ─── Studios ──────────────────────────────────────────────────────────────────

function StudioCard({ studio, onAsk, disabled }: { studio: StudioCardItem; onAsk: Props["onAsk"]; disabled: boolean }) {
    const price = studio.price
        ? { value: inr(studio.price), unit: "/hr" }
        : studio.priceRange
            ? { value: `${inr(studio.priceRange.min)}–${inr(studio.priceRange.max)}`, unit: "/hr" }
            : null;

    return (
        <li className={cn(shell, "group flex w-[232px] shrink-0 snap-start flex-col overflow-hidden")}>
            <Link
                href={studio.url}
                target="_blank"
                rel="noopener"
                className="relative block aspect-[4/3] overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40"
                aria-label={`Open ${studio.title} in a new tab`}
            >
                {studio.image ? (
                    <Image
                        src={studio.image}
                        alt=""
                        fill
                        sizes="232px"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No photo yet</div>
                )}
                <span
                    className={cn(
                        "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur",
                        studio.bookable ? "bg-background/90 text-foreground" : "bg-foreground/75 text-background"
                    )}
                >
                    {studio.bookable && <LuBadgeCheck size={11} aria-hidden />}
                    {studio.bookable ? "Verified" : "Curated"}
                </span>
                {price && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
                        {price.value}
                        <span className="font-normal text-muted-foreground">{price.unit}</span>
                    </span>
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                    <h4 className="line-clamp-1 text-sm font-semibold leading-5 text-foreground">{studio.title}</h4>
                    {studio.locality && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <LuMapPin size={11} className="shrink-0" aria-hidden />
                            <span className="line-clamp-1">{studio.locality}</span>
                        </p>
                    )}
                </div>

                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {studio.people ? (
                        <li className="flex items-center gap-1"><LuUsers size={11} aria-hidden />Up to {studio.people}</li>
                    ) : null}
                    {studio.areaSqFt ? (
                        <li className="flex items-center gap-1"><LuMaximize2 size={11} aria-hidden />{studio.areaSqFt.toLocaleString("en-IN")} sq ft</li>
                    ) : null}
                    {studio.rating ? (
                        <li className="flex items-center gap-1"><LuStar size={11} aria-hidden />{studio.rating.toFixed(1)}</li>
                    ) : null}
                    {studio.lightsIncluded ? (
                        <li className="flex items-center gap-1"><LuLightbulb size={11} aria-hidden />Lights included</li>
                    ) : null}
                </ul>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAsk(studio.bookable ? `Check dates for ${studio.title}` : `I'd like to enquire about ${studio.title}`)}
                    className={cn(chipButton, "mt-auto w-full justify-center")}
                >
                    {studio.bookable ? "Check dates" : "Enquire"}
                </button>
            </div>
        </li>
    );
}

function StudiosCard({ card, onAsk, disabled }: Props & { card: Extract<ConciergeCard, { type: "studios" }> }) {
    return (
        <div className="-mx-4">
            <ul
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label={`${card.items.length} studios`}
            >
                {card.items.map((studio) => (
                    <StudioCard key={studio.id} studio={studio} onAsk={onAsk} disabled={disabled} />
                ))}
            </ul>
        </div>
    );
}

// ─── Availability ─────────────────────────────────────────────────────────────

function AvailabilityCard({ card, onAsk, disabled }: Props & { card: Extract<ConciergeCard, { type: "availability" }> }) {
    const free = card.windows.length > 0;
    return (
        <section className={cn(shell, "p-4")} aria-label={`Availability for ${card.studio.title}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={eyebrow}>Availability</p>
                    <h4 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{card.studio.title}</h4>
                </div>
                <span
                    className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        free ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}
                >
                    <span className={cn("h-1.5 w-1.5 rounded-full", free ? "bg-success" : "bg-neutral-400")} aria-hidden />
                    {free ? "Free slots" : "Unavailable"}
                </span>
            </div>

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <LuCalendarDays size={13} aria-hidden />
                    <dt className="sr-only">Date</dt>
                    <dd className="text-foreground">{prettyDate(card.date)}</dd>
                </div>
                {card.openHours && (
                    <div className="flex items-center gap-1.5">
                        <LuClock size={13} aria-hidden />
                        <dt className="sr-only">Open</dt>
                        <dd>Open {card.openHours}</dd>
                    </div>
                )}
            </dl>

            {free ? (
                <>
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {card.windows.map((window) => (
                            <li key={`${window.from}-${window.to}`}>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onAsk(`Price ${card.studio.title} on ${prettyDate(card.date)} starting ${window.from}`)}
                                    className={chipButton}
                                >
                                    {window.from} – {window.to}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Minimum booking {card.minimumHours} {card.minimumHours === 1 ? "hour" : "hours"}. Tap a window to price it.
                    </p>
                </>
            ) : (
                <p className="mt-3 text-sm text-muted-foreground">{card.closedReason ?? "Nothing free on this date."}</p>
            )}
        </section>
    );
}

// ─── Quote ────────────────────────────────────────────────────────────────────

function QuoteCard({ card }: { card: Extract<ConciergeCard, { type: "quote" }> }) {
    return (
        <section className={cn(shell, "overflow-hidden")} aria-label={`Quote for ${card.studio.title}`}>
            <div className="p-4">
                <p className={eyebrow}>Quote</p>
                <h4 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{card.studio.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                    {prettyDate(card.date)} · {card.from} – {card.to}
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                    {card.lines.map((line) => (
                        <div key={line.label} className="flex items-baseline justify-between gap-4">
                            <dt className="text-muted-foreground">{line.label}</dt>
                            <dd className="tabular-nums text-foreground">{inr(line.amount)}</dd>
                        </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-muted-foreground">GST (18%)</dt>
                        <dd className="tabular-nums text-foreground">{inr(card.gst)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-border pt-3">
                        <dt className="font-medium text-foreground">Total</dt>
                        <dd className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{inr(card.total)}</dd>
                    </div>
                </dl>
                {card.note && <p className="mt-3 text-xs leading-4 text-muted-foreground">{card.note}</p>}
            </div>
            <div className="border-t border-border bg-muted/50 p-3">
                <Link href={card.studio.url} target="_blank" rel="noopener" className={primaryButton}>
                    Book on the studio page <LuArrowUpRight size={15} aria-hidden />
                </Link>
            </div>
        </section>
    );
}

// ─── Book ─────────────────────────────────────────────────────────────────────

function BookCard({ card }: { card: Extract<ConciergeCard, { type: "book" }> }) {
    const when = [card.date ? prettyDate(card.date) : null, card.from && card.to ? `${card.from} – ${card.to}` : card.from].filter(Boolean).join(" · ");
    return (
        <section className={cn(shell, "p-4")} aria-label={`Book ${card.studio.title}`}>
            <p className={eyebrow}>Ready to book</p>
            <h4 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{card.studio.title}</h4>
            {when && <p className="mt-1 text-xs text-muted-foreground">{when}</p>}
            <Link href={card.studio.url} target="_blank" rel="noopener" className={cn(primaryButton, "mt-3")}>
                Choose your slot and pay <LuArrowUpRight size={15} aria-hidden />
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">Nothing is booked until you pay on the studio page.</p>
        </section>
    );
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

function PlanSection({ title, count, children, defaultOpen = false }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
    return (
        <details className="group border-t border-border" open={defaultOpen}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 [&::-webkit-details-marker]:hidden">
                <span>
                    {title} <span className="font-normal text-muted-foreground">· {count}</span>
                </span>
                <LuChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-4 pb-4">{children}</div>
        </details>
    );
}

function PlanCard({ card }: { card: Extract<ConciergeCard, { type: "plan" }> }) {
    const [done, setDone] = useState<Set<number>>(new Set());
    const toggle = (index: number) =>
        setDone((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    const largest = Math.max(...card.budget.map((line) => line.amount), 1);

    return (
        <section className={cn(shell, "overflow-hidden")} aria-label="Shoot plan">
            <div className="p-4">
                <p className={eyebrow}>Shoot plan</p>
                <h4 className="mt-1 text-sm font-semibold text-foreground">{card.title}</h4>
            </div>

            <PlanSection title="Schedule" count={card.schedule.length} defaultOpen>
                <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-border">
                    {card.schedule.map((block) => (
                        <li key={`${block.time}-${block.what}`} className="relative pl-5">
                            <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-foreground bg-background" aria-hidden />
                            <p className="text-xs font-medium tabular-nums text-muted-foreground">{block.time}</p>
                            <p className="text-sm leading-5 text-foreground">{block.what}</p>
                        </li>
                    ))}
                </ol>
            </PlanSection>

            <PlanSection title="Shot list" count={card.shots.length}>
                <ol className="space-y-2">
                    {card.shots.map((shot, index) => (
                        <li key={shot} className="flex gap-3 text-sm leading-5 text-foreground">
                            <span className="w-4 shrink-0 text-right text-xs tabular-nums leading-5 text-muted-foreground">{index + 1}</span>
                            {shot}
                        </li>
                    ))}
                </ol>
            </PlanSection>

            <PlanSection title="Checklist" count={card.checklist.length}>
                <ul className="space-y-1">
                    {card.checklist.map((item, index) => {
                        const checked = done.has(index);
                        return (
                            <li key={item}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    onClick={() => toggle(index)}
                                    className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left text-sm leading-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                                >
                                    <span
                                        className={cn(
                                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                            checked ? "border-foreground bg-foreground text-background" : "border-neutral-300 bg-background"
                                        )}
                                        aria-hidden
                                    >
                                        {checked && <LuCheck size={11} strokeWidth={3} />}
                                    </span>
                                    <span className={cn(checked ? "text-muted-foreground line-through" : "text-foreground")}>{item}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </PlanSection>

            {card.budget.length > 0 && card.budgetTotal ? (
                <PlanSection title="Budget" count={card.budget.length}>
                    <ul className="space-y-2.5">
                        {card.budget.map((line) => (
                            <li key={line.label}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="text-foreground">{line.label}</span>
                                    <span className="tabular-nums text-foreground">{inr(line.amount)}</span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, (line.amount / largest) * 100)}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 flex items-baseline justify-between border-t border-dashed border-border pt-3 text-sm">
                        <span className="font-medium text-foreground">Total budget</span>
                        <span className="font-semibold tabular-nums text-foreground">{inr(card.budgetTotal)}</span>
                    </p>
                    <p className="mt-2 text-xs leading-4 text-muted-foreground">A suggested split of your budget, not a quote. Studio prices come from live quotes.</p>
                </PlanSection>
            ) : null}
        </section>
    );
}

// ─── Shortlist ────────────────────────────────────────────────────────────────

function ShortlistCard({ card }: { card: Extract<ConciergeCard, { type: "shortlist" }> }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(new URL(card.url, window.location.origin).toString());
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard blocked: the Open button still works.
        }
    };
    return (
        <section className={cn(shell, "p-4")} aria-label="Shortlist">
            <p className={eyebrow}>Shortlist</p>
            <h4 className="mt-1 text-sm font-semibold text-foreground">{card.count} studios on one page</h4>
            <p className="mt-1 text-xs text-muted-foreground">Share it with your team or client. The link works for 30 days.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                >
                    {copied ? <LuCheck size={15} aria-hidden /> : <LuCopy size={15} aria-hidden />}
                    <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
                </button>
                <Link href={card.url} target="_blank" rel="noopener" className={primaryButton}>
                    Open <LuArrowUpRight size={15} aria-hidden />
                </Link>
            </div>
        </section>
    );
}

// ─── Handoff ──────────────────────────────────────────────────────────────────

function HandoffCard({ card }: { card: Extract<ConciergeCard, { type: "handoff" }> }) {
    return (
        <section className={cn(shell, "p-4")} aria-label="Handed over to the team">
            <p className={eyebrow}>With the team</p>
            <h4 className="mt-1 text-sm font-semibold text-foreground">A person from ContCave will pick this up</h4>
            <p className="mt-1 text-xs text-muted-foreground">Prefer not to wait? Continue the conversation on WhatsApp.</p>
            <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1FA855] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA855]/50 focus-visible:ring-offset-2"
            >
                <IoLogoWhatsapp size={17} aria-hidden /> Continue on WhatsApp
            </a>
        </section>
    );
}

export default function ConciergeCardView(props: Props) {
    const { card } = props;
    switch (card.type) {
        case "studios":
            return <StudiosCard {...props} card={card} />;
        case "availability":
            return <AvailabilityCard {...props} card={card} />;
        case "quote":
            return <QuoteCard card={card} />;
        case "book":
            return <BookCard card={card} />;
        case "plan":
            return <PlanCard card={card} />;
        case "shortlist":
            return <ShortlistCard card={card} />;
        case "handoff":
            return <HandoffCard card={card} />;
        default:
            return null;
    }
}
