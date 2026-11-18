"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import {
    LuArrowUpRight,
    LuCalendarDays,
    LuCheck,
    LuChevronDown,
    LuClock,
    LuCopy,
    LuMapPin,
    LuStar,
    LuWallet,
} from "react-icons/lu";

import ListingTypeBadge from "@/components/listing/ListingTypeBadge";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Pill from "@/components/ui/Pill";
import WhatsAppLinkButton from "@/components/ui/WhatsAppLinkButton";
import type { ConciergeCard, StudioCardItem } from "@/lib/concierge/types";
import { cn, formatINR } from "@/lib/utils";

type Props = {
    card: ConciergeCard;
    onAsk: (text: string) => void;
    disabled: boolean;
};

type CardOf<T extends ConciergeCard["type"]> = Extract<ConciergeCard, { type: T }>;

export const prettyDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const SHELL = "overflow-hidden rounded-2xl border border-border bg-background";

function CardHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
            <h4 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-foreground">{title}</h4>
            {meta && <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>}
        </div>
    );
}

function OpenLink({ href, label }: { href: string; label: string }) {
    return (
        <Button href={href} target="_blank" size="md">
            {label}
            <LuArrowUpRight size={16} aria-hidden />
        </Button>
    );
}

function StudioCard({ studio, onAsk, disabled }: { studio: StudioCardItem; onAsk: Props["onAsk"]; disabled: boolean }) {
    const facts = [
        studio.estimate && { icon: LuWallet, text: studio.estimate },
        studio.availability && { icon: LuCalendarDays, text: studio.availability },
        studio.rating && { icon: LuStar, text: studio.rating.toFixed(1) },
    ].filter((fact): fact is { icon: typeof LuStar; text: string } => Boolean(fact));

    return (
        <li className={cn(SHELL, "group flex w-[248px] shrink-0 snap-start flex-col")}>
            <Link
                href={studio.url}
                target="_blank"
                rel="noopener"
                className="relative block aspect-[4/3] overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40"
                aria-label={`Open ${studio.title} in a new tab`}
            >
                {studio.image ? (
                    <Image src={studio.image} alt="" fill sizes="248px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                ) : (
                    <span className="flex h-full items-center justify-center text-sm text-muted-foreground">No photo yet</span>
                )}
                <span className="absolute left-2.5 top-2.5 flex gap-1.5">
                    <ListingTypeBadge listingType={studio.bookable ? "STANDARD" : "CURATED"} />
                    {studio.fallback && <Pill size="xs" variant="neutral" className="bg-background/80 tracking-normal" label="Closest" />}
                </span>
            </Link>

            <div className="flex flex-1 flex-col gap-3 p-3.5">
                <div>
                    <h4 className="line-clamp-1 text-base font-semibold leading-6 text-foreground">{studio.title}</h4>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <LuMapPin size={13} className="shrink-0" aria-hidden />
                        <span className="line-clamp-1">{studio.location}</span>
                    </p>
                </div>
                {facts.length > 0 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        {facts.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-start gap-1.5">
                                <Icon size={13} className="mt-1 shrink-0" aria-hidden />
                                {text}
                            </li>
                        ))}
                    </ul>
                )}
                <Button
                    outline
                    size="md"
                    className="mt-auto"
                    disabled={disabled}
                    label={studio.bookable ? "Check dates" : "Enquire"}
                    onClick={() => onAsk(studio.bookable ? `Check dates for ${studio.title}` : `I'd like to enquire about ${studio.title}`)}
                />
            </div>
        </li>
    );
}

function StudiosCard({ card, onAsk, disabled }: Props & { card: CardOf<"studios"> }) {
    return (
        <div className="space-y-2">
            {card.notices.map((notice) => (
                <p key={notice} className="text-sm text-muted-foreground">{notice}</p>
            ))}
            <div className="-mx-5">
                <ul
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label={`${card.items.length} studios`}
                >
                    {card.items.map((studio) => (
                        <StudioCard key={studio.id} studio={studio} onAsk={onAsk} disabled={disabled} />
                    ))}
                </ul>
            </div>
        </div>
    );
}

function AvailabilityCard({ card, onAsk, disabled }: Props & { card: CardOf<"availability"> }) {
    const free = card.windows.length > 0;
    return (
        <section className={cn(SHELL, "p-4")} aria-label={`Availability for ${card.studio.title}`}>
            <div className="flex items-start justify-between gap-3">
                <CardHeader eyebrow="Availability" title={card.studio.title} />
                <Pill size="sm" variant={free ? "success" : "neutral"} className="shrink-0 tracking-normal" label={free ? "Free slots" : "Unavailable"} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                    <LuCalendarDays size={14} aria-hidden />
                    <span className="text-foreground">{prettyDate(card.date)}</span>
                </li>
                {card.openHours && (
                    <li className="flex items-center gap-1.5">
                        <LuClock size={14} aria-hidden />
                        Open {card.openHours}
                    </li>
                )}
            </ul>
            {free ? (
                <>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {card.windows.map((window) => (
                            <li key={`${window.from}-${window.to}`}>
                                <Button
                                    outline
                                    rounded
                                    fit
                                    disabled={disabled}
                                    label={`${window.from} – ${window.to}`}
                                    onClick={() => onAsk(`Price ${card.studio.title} on ${prettyDate(card.date)} starting ${window.from}`)}
                                />
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground">
                        Minimum {card.minimumHours} {card.minimumHours === 1 ? "hour" : "hours"}. Tap a time to price it.
                    </p>
                </>
            ) : (
                <p className="mt-3 text-sm text-muted-foreground">{card.closedReason ?? "Nothing free on this date."}</p>
            )}
        </section>
    );
}

function AmountRow({ label, amount, total = false }: { label: string; amount: number; total?: boolean }) {
    return (
        <div className={cn("flex items-baseline justify-between gap-4", total && "border-t border-dashed border-border pt-3")}>
            <dt className={total ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</dt>
            <dd className={cn("tabular-nums text-foreground", total && "text-lg font-semibold tracking-tight")}>{formatINR(amount)}</dd>
        </div>
    );
}

function QuoteCard({ card }: { card: CardOf<"quote"> }) {
    return (
        <section className={cn(SHELL, "space-y-4 p-4")} aria-label={`Quote for ${card.studio.title}`}>
            <CardHeader eyebrow="Quote" title={card.studio.title} meta={`${prettyDate(card.date)} · ${card.from} – ${card.to}`} />
            <dl className="space-y-2 text-sm">
                {card.lines.map((line) => (
                    <AmountRow key={line.label} label={line.label} amount={line.amount} />
                ))}
                <AmountRow label="GST (18%)" amount={card.gst} />
                <AmountRow label="Total" amount={card.total} total />
            </dl>
            {card.note && <p className="text-sm text-muted-foreground">{card.note}</p>}
            <OpenLink href={card.studio.url} label="Book on the studio page" />
        </section>
    );
}

function BookCard({ card }: { card: CardOf<"book"> }) {
    const when = [card.date ? prettyDate(card.date) : null, card.from && card.to ? `${card.from} – ${card.to}` : card.from].filter(Boolean).join(" · ");
    return (
        <section className={cn(SHELL, "space-y-3 p-4")} aria-label={`Book ${card.studio.title}`}>
            <CardHeader eyebrow="Ready to book" title={card.studio.title} meta={when || undefined} />
            <OpenLink href={card.studio.url} label="Choose your slot and pay" />
            <p className="text-center text-sm text-muted-foreground">Nothing is booked until you pay on the studio page.</p>
        </section>
    );
}

function PlanSection({ title, count, children, defaultOpen = false }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
    return (
        <details className="group border-t border-border" open={defaultOpen}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 [&::-webkit-details-marker]:hidden">
                <span>
                    {title} <span className="font-normal text-muted-foreground">· {count}</span>
                </span>
                <LuChevronDown size={16} className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-4 pb-4">{children}</div>
        </details>
    );
}

function PlanCard({ card }: { card: CardOf<"plan"> }) {
    const id = useId();
    const largest = Math.max(...card.budget.map((line) => line.amount), 1);

    return (
        <section className={SHELL} aria-label="Shoot plan">
            <div className="p-4">
                <CardHeader eyebrow="Shoot plan" title={card.title} />
            </div>

            <PlanSection title="Schedule" count={card.schedule.length} defaultOpen>
                <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-border">
                    {card.schedule.map((block) => (
                        <li key={`${block.time}-${block.what}`} className="relative pl-5">
                            <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-foreground bg-background" aria-hidden />
                            <p className="text-sm font-medium tabular-nums text-muted-foreground">{block.time}</p>
                            <p className="text-base leading-6 text-foreground">{block.what}</p>
                        </li>
                    ))}
                </ol>
            </PlanSection>

            <PlanSection title="Shot list" count={card.shots.length}>
                <ol className="list-decimal space-y-2 pl-5 text-base leading-6 text-foreground marker:text-sm marker:text-muted-foreground">
                    {card.shots.map((shot) => (
                        <li key={shot}>{shot}</li>
                    ))}
                </ol>
            </PlanSection>

            <PlanSection title="Checklist" count={card.checklist.length}>
                <ul className="space-y-3">
                    {card.checklist.map((item, index) => (
                        <li key={item}>
                            <Checkbox id={`${id}-check-${index}`} label={item} />
                        </li>
                    ))}
                </ul>
            </PlanSection>

            {card.budget.length > 0 && card.budgetTotal ? (
                <PlanSection title="Budget" count={card.budget.length}>
                    <ul className="space-y-3">
                        {card.budget.map((line) => (
                            <li key={line.label}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="text-foreground">{line.label}</span>
                                    <span className="tabular-nums text-foreground">{formatINR(line.amount)}</span>
                                </div>
                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, (line.amount / largest) * 100)}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <dl className="mt-3 text-sm">
                        <AmountRow label="Total budget" amount={card.budgetTotal} total />
                    </dl>
                    <p className="mt-2 text-sm text-muted-foreground">A suggested split, not a quote. Studio prices come from live quotes.</p>
                </PlanSection>
            ) : null}
        </section>
    );
}

function ShortlistCard({ card }: { card: CardOf<"shortlist"> }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(new URL(card.url, window.location.origin).toString());
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.warn("[spot] copying the shortlist link failed", error);
        }
    };
    return (
        <section className={cn(SHELL, "space-y-3 p-4")} aria-label="Shortlist">
            <CardHeader eyebrow="Shortlist" title={`${card.count} studios on one page`} meta="Share it with your team or client. The link works for 30 days." />
            <div className="grid grid-cols-2 gap-2">
                <Button outline size="md" icon={copied ? LuCheck : LuCopy} label={copied ? "Copied" : "Copy link"} aria-live="polite" onClick={copy} />
                <OpenLink href={card.url} label="Open" />
            </div>
        </section>
    );
}

function HandoffCard({ card }: { card: CardOf<"handoff"> }) {
    return (
        <section className={cn(SHELL, "space-y-3 p-4")} aria-label="Handed over to the team">
            <CardHeader eyebrow="With the team" title="A person from ContCave will pick this up" meta="Prefer not to wait? Continue on WhatsApp." />
            <WhatsAppLinkButton href={card.url} label="Continue on WhatsApp" className="shadow-none" />
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
