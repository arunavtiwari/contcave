"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    LuArrowUp,
    LuCalendarDays,
    LuCamera,
    LuClock,
    LuMapPin,
    LuMic,
    LuShirt,
    LuSparkles,
    LuSquarePen,
    LuUsers,
    LuWallet,
    LuX,
} from "react-icons/lu";

import type { ConciergeBrief } from "@/lib/concierge/types";
import { CONCIERGE_NAME, MAX_USER_MESSAGE_LENGTH } from "@/lib/concierge/types";
import { cn } from "@/lib/utils";

import ConciergeCardView, { prettyDate } from "./ConciergeCards";
import { type PendingReply, useConcierge } from "./useConcierge";

const STARTERS = [
    { icon: LuCamera, title: "Product shoot", prompt: "I need a studio for a product shoot in Delhi this weekend" },
    { icon: LuShirt, title: "Fashion lookbook", prompt: "Looking for a fashion shoot studio in Mumbai with natural light" },
    { icon: LuMic, title: "Podcast recording", prompt: "I want to record a podcast for 2 hours in Delhi NCR" },
    { icon: LuWallet, title: "Plan within a budget", prompt: "Help me plan a half-day shoot within a ₹30,000 budget" },
];

const inr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** **bold** and line breaks only. The text is rendered as React nodes, never as HTML. */
function RichText({ text }: { text: string }) {
    const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);
    return (
        <>
            {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                    {paragraph.split(/(\*\*[^*\n]+\*\*)/g).map((part, partIndex) =>
                        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
                            <strong key={partIndex} className="font-semibold text-foreground">
                                {part.slice(2, -2)}
                            </strong>
                        ) : (
                            <span key={partIndex}>{part}</span>
                        )
                    )}
                </p>
            ))}
        </>
    );
}

function Mark({ size = 28 }: { size?: number }) {
    return (
        <span
            className="flex shrink-0 items-center justify-center rounded-full bg-foreground text-background"
            style={{ width: size, height: size }}
            aria-hidden
        >
            <LuSparkles size={Math.round(size * 0.5)} />
        </span>
    );
}

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((dot) => (
                <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
                    style={{ animationDelay: `${dot * 120}ms`, animationDuration: "900ms" }}
                />
            ))}
        </span>
    );
}

function BriefStrip({ brief }: { brief: ConciergeBrief }) {
    const facts = [
        brief.shootType && { icon: LuCamera, label: brief.shootType },
        brief.city && { icon: LuMapPin, label: brief.city },
        brief.date && { icon: LuCalendarDays, label: prettyDate(brief.date) },
        brief.hours && { icon: LuClock, label: `${brief.hours} ${brief.hours === 1 ? "hr" : "hrs"}` },
        brief.people && { icon: LuUsers, label: `${brief.people} people` },
        brief.budgetPerHour
            ? { icon: LuWallet, label: `${inr(brief.budgetPerHour)}/hr` }
            : brief.budgetTotal
                ? { icon: LuWallet, label: inr(brief.budgetTotal) }
                : null,
    ].filter((fact): fact is { icon: typeof LuCamera; label: string } => Boolean(fact));

    if (facts.length === 0) return null;
    return (
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
            <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Your brief so far">
                {facts.map(({ icon: Icon, label }) => (
                    <li
                        key={label}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium capitalize text-foreground"
                    >
                        <Icon size={11} className="text-muted-foreground" aria-hidden />
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AssistantReply({
    text,
    cards,
    status,
    streaming,
    onAsk,
    disabled,
}: PendingReply & { streaming: boolean; onAsk: (text: string) => void; disabled: boolean }) {
    const waiting = streaming && !text && cards.length === 0;
    return (
        <div className="flex gap-2.5">
            <Mark size={28} />
            <div className="min-w-0 flex-1 space-y-3 pt-0.5">
                {text && (
                    <div className="space-y-3 text-base leading-7 text-foreground">
                        <RichText text={text} />
                    </div>
                )}
                {cards.map((card, index) => (
                    <ConciergeCardView key={`${card.type}-${index}`} card={card} onAsk={onAsk} disabled={disabled} />
                ))}
                {streaming && (status || waiting) && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TypingDots />
                        {status ?? "Thinking"}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function ConciergeWidget() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const chat = useConcierge();
    const { restore, send, restored } = chat;

    // Portals need the document, which only exists after hydration.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const titleId = useId();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const stickToBottom = useRef(true);

    useEffect(() => {
        if (open && !restored) void restore();
    }, [open, restored, restore]);

    // Focus the composer on open; give focus back to the launcher on close.
    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
        const launcher = launcherRef.current;
        return () => {
            window.clearTimeout(timer);
            launcher?.focus({ preventScroll: true });
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    // On phones the chat is a full-screen sheet: stop the page behind it from scrolling.
    useEffect(() => {
        if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    // Follow new content, unless the reader has scrolled up to look at something.
    useLayoutEffect(() => {
        const log = logRef.current;
        if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
    }, [chat.messages, chat.pending, chat.suggestions, chat.error, open]);

    const onScroll = () => {
        const log = logRef.current;
        if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    };

    const resize = useCallback(() => {
        const input = inputRef.current;
        if (!input) return;
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }, []);
    useLayoutEffect(resize, [draft, open, resize]);

    const submit = useCallback(
        (text: string) => {
            if (!text.trim() || chat.busy) return;
            stickToBottom.current = true;
            setDraft("");
            void send(text);
        },
        [chat.busy, send]
    );

    const empty = chat.messages.length === 0 && !chat.pending;
    const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

    return (
        <>
            <AnimatePresence initial={false}>
                {!open && (
                    <motion.button
                        ref={launcherRef}
                        key="launcher"
                        type="button"
                        onClick={() => setOpen(true)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={spring}
                        aria-haspopup="dialog"
                        aria-label={`Plan your shoot with ${CONCIERGE_NAME}, ContCave's AI assistant`}
                        className="group flex h-14 min-w-14 items-center justify-center gap-2.5 rounded-full border border-white/10 bg-foreground px-4 text-background transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 sm:pl-4 sm:pr-5"
                    >
                        <LuSparkles size={18} aria-hidden />
                        <span className="hidden text-[15px] font-medium tracking-tight sm:inline">Plan my shoot</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Rendered on <body>: the launcher sits in a fixed, z-indexed stack, and a panel inside it
                could never rise above the site's navbar on phones, where the chat is a full-screen sheet. */}
            {mounted && createPortal(
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="panel"
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby={titleId}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={spring}
                        style={{ transformOrigin: "bottom right" }}
                        className="fixed inset-0 z-[1000] flex flex-col bg-background sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100dvh-2.5rem))] sm:w-[420px] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-border"
                    >
                        {/* Header */}
                        <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <Mark size={40} />
                            <div className="min-w-0 flex-1">
                                <h2 id={titleId} className="text-base font-semibold leading-6 tracking-tight text-foreground">
                                    {CONCIERGE_NAME}
                                </h2>
                                <p className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                                    <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                                    Finds, prices and books studios
                                </p>
                            </div>
                            {!empty && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        chat.reset();
                                        setDraft("");
                                        inputRef.current?.focus();
                                    }}
                                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                                    aria-label="Start a new chat"
                                    title="Start a new chat"
                                >
                                    <LuSquarePen size={17} aria-hidden />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                                aria-label="Close chat"
                            >
                                <LuX size={18} aria-hidden />
                            </button>
                        </header>

                        <BriefStrip brief={chat.brief} />

                        {/* Conversation */}
                        <div
                            ref={logRef}
                            onScroll={onScroll}
                            role="log"
                            aria-live="polite"
                            aria-relevant="additions"
                            className="flex-1 overflow-y-auto overscroll-contain px-4 py-5"
                        >
                            {empty ? (
                                <div className="flex min-h-full flex-col justify-end">
                                    <h3 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
                                        Tell me about
                                        <br />
                                        your shoot.
                                    </h3>
                                    <p className="mt-3 max-w-[32ch] text-base leading-7 text-muted-foreground">
                                        I&apos;ll find studios that fit your budget, date and look, check live availability, and plan the day.
                                    </p>
                                    <ul className="mt-6 grid grid-cols-2 gap-2">
                                        {STARTERS.map(({ icon: Icon, title, prompt }) => (
                                            <li key={title}>
                                                <button
                                                    type="button"
                                                    onClick={() => submit(prompt)}
                                                    className="flex h-full min-h-[112px] w-full flex-col justify-between gap-3 rounded-[20px] border border-border bg-muted/40 p-3.5 text-left transition-colors hover:border-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                                                >
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border">
                                                        <Icon size={16} aria-hidden />
                                                    </span>
                                                    <span>
                                                        <span className="block text-[15px] font-semibold leading-5 text-foreground">{title}</span>
                                                        <span className="mt-1 line-clamp-2 block text-[13px] leading-[18px] text-muted-foreground">{prompt}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <ol className="space-y-6">
                                    {chat.messages.map((message) => (
                                        <li key={message.id}>
                                            {message.role === "user" ? (
                                                <div className="flex justify-end">
                                                    <p className="max-w-[85%] whitespace-pre-line break-words rounded-[22px] rounded-br-md bg-foreground px-4 py-2.5 text-base leading-6 text-background">
                                                        {message.text}
                                                    </p>
                                                </div>
                                            ) : (
                                                <AssistantReply
                                                    text={message.text}
                                                    cards={message.cards}
                                                    status={null}
                                                    streaming={false}
                                                    onAsk={submit}
                                                    disabled={chat.busy}
                                                />
                                            )}
                                        </li>
                                    ))}
                                    {chat.pending && (
                                        <li>
                                            <AssistantReply {...chat.pending} streaming onAsk={submit} disabled />
                                        </li>
                                    )}
                                    {chat.error && (
                                        <li role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm leading-5 text-danger">
                                            {chat.error}
                                        </li>
                                    )}
                                </ol>
                            )}
                        </div>

                        {/* Composer */}
                        <div className="border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                            {chat.suggestions.length > 0 && !chat.busy && (
                                <ul className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Suggested replies">
                                    {chat.suggestions.map((suggestion) => (
                                        <li key={suggestion} className="shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => submit(suggestion)}
                                                className="inline-flex h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                                            >
                                                {suggestion}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submit(draft);
                                }}
                                className="flex items-end gap-2 rounded-[24px] border border-border bg-muted/40 py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-foreground focus-within:bg-background"
                            >
                                <label htmlFor={`${titleId}-input`} className="sr-only">
                                    Message {CONCIERGE_NAME}
                                </label>
                                <textarea
                                    id={`${titleId}-input`}
                                    ref={inputRef}
                                    rows={1}
                                    value={draft}
                                    maxLength={MAX_USER_MESSAGE_LENGTH}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                                            event.preventDefault();
                                            submit(draft);
                                        }
                                    }}
                                    placeholder={chat.handedOff ? "Add anything else for the team" : "City, what you're shooting, when…"}
                                    className="max-h-[120px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-0 py-2.5 text-base leading-6 text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                                />
                                <button
                                    type="submit"
                                    disabled={!draft.trim() || chat.busy}
                                    aria-label="Send message"
                                    className={cn(
                                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2",
                                        draft.trim() && !chat.busy ? "bg-foreground text-background hover:opacity-85" : "bg-muted text-neutral-400"
                                    )}
                                >
                                    <LuArrowUp size={19} strokeWidth={2.5} aria-hidden />
                                </button>
                            </form>
                            <p className="mt-2 text-center text-xs leading-4 text-muted-foreground">
                                AI can make mistakes. Prices and availability are checked live.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}
        </>
    );
}
