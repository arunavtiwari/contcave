"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiAlertCircle } from "react-icons/fi";
import {
    LuArrowUp,
    LuCalendarDays,
    LuCamera,
    LuChevronRight,
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
import ReactMarkdown from "react-markdown";

import Button from "@/components/ui/Button";
import Callout from "@/components/ui/Callout";
import Pill from "@/components/ui/Pill";
import Textarea from "@/components/ui/Textarea";
import type { ConciergeBrief } from "@/lib/concierge/types";
import { CONCIERGE_NAME, MAX_USER_MESSAGE_LENGTH } from "@/lib/concierge/types";
import { cn, formatINR } from "@/lib/utils";

import ConciergeCardView, { prettyDate } from "./ConciergeCards";
import { type PendingReply, useConcierge } from "./useConcierge";

const STARTERS = [
    { icon: LuCamera, title: "Product shoot", prompt: "I need a studio for a product shoot in Delhi this weekend" },
    { icon: LuShirt, title: "Fashion lookbook", prompt: "Looking for a fashion shoot studio in Mumbai with natural light" },
    { icon: LuMic, title: "Podcast recording", prompt: "I want to record a podcast for 2 hours in Delhi NCR" },
    { icon: LuWallet, title: "Plan within a budget", prompt: "Help me plan a half-day shoot within a ₹30,000 budget" },
];

const COMPOSER_MAX_HEIGHT = 140;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 32 };

const MARKDOWN_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "a", "br"];

/** The assistant's Markdown: paragraphs, emphasis, lists and links only; raw HTML is never rendered. */
function RichText({ text }: { text: string }) {
    return (
        <div className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-a:text-foreground prose-a:underline-offset-4">
            <ReactMarkdown
                allowedElements={MARKDOWN_ELEMENTS}
                unwrapDisallowed
                skipHtml
                components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}

function Mark({ size }: { size: number }) {
    return (
        <span className="flex shrink-0 items-center justify-center rounded-full bg-foreground text-background" style={{ width: size, height: size }} aria-hidden>
            <LuSparkles size={Math.round(size * 0.48)} />
        </span>
    );
}

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${dot * 120}ms`, animationDuration: "900ms" }} />
            ))}
        </span>
    );
}

function BriefStrip({ brief }: { brief: ConciergeBrief }) {
    const budget = brief.budgetPerHour ? `${formatINR(brief.budgetPerHour)}/hr` : brief.budgetTotal ? formatINR(brief.budgetTotal) : null;
    const facts = [
        brief.shootType && { icon: LuCamera, label: brief.shootType },
        brief.city && { icon: LuMapPin, label: brief.city },
        brief.date && { icon: LuCalendarDays, label: prettyDate(brief.date) },
        brief.hours && { icon: LuClock, label: `${brief.hours} ${brief.hours === 1 ? "hr" : "hrs"}` },
        brief.people && { icon: LuUsers, label: `${brief.people} people` },
        budget && { icon: LuWallet, label: budget },
    ].filter((fact): fact is { icon: typeof LuCamera; label: string } => Boolean(fact));

    if (facts.length === 0) return null;
    return (
        <ul className="flex gap-1.5 overflow-x-auto border-b border-border px-5 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Your brief so far">
            {facts.map(({ icon, label }) => (
                <li key={label} className="shrink-0">
                    <Pill size="sm" variant="outline" icon={icon} label={label} className="rounded-full capitalize tracking-normal text-foreground" />
                </li>
            ))}
        </ul>
    );
}

function AssistantReply({ text, cards, status, streaming, onAsk, disabled }: PendingReply & { streaming: boolean; onAsk: (text: string) => void; disabled: boolean }) {
    const waiting = streaming && !text && cards.length === 0;
    return (
        <div className="space-y-3">
            {text && (
                <RichText text={text} />
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
    );
}

function Starters({ onPick }: { onPick: (prompt: string) => void }) {
    return (
        <div className="flex min-h-full flex-col justify-end gap-6">
            <div className="space-y-2">
                <Mark size={32} />
                <h3 className="pt-2 text-lg font-semibold tracking-tight text-foreground">What are you shooting?</h3>
                <p className="text-sm leading-6 text-muted-foreground">I&apos;ll find studios that fit your budget, date and look, check live availability and plan the day.</p>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {STARTERS.map(({ icon: Icon, title, prompt }) => (
                    <li key={title}>
                        <Button variant="ghost" onClick={() => onPick(prompt)} className="h-auto min-h-12 justify-start gap-3 rounded-none px-4 py-2.5 text-left font-normal">
                            <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">{title}</span>
                                <span className="block truncate text-sm text-muted-foreground">{prompt}</span>
                            </span>
                            <LuChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ConciergeWidget() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const chat = useConcierge();
    const { restore, send, restored } = chat;

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const titleId = useId();
    const inputId = `${titleId}-input`;
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const stickToBottom = useRef(true);

    useEffect(() => {
        if (open && !restored) void restore();
    }, [open, restored, restore]);

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

    useEffect(() => {
        if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

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
        const height = input.scrollHeight + input.offsetHeight - input.clientHeight;
        input.style.height = `${Math.min(height, COMPOSER_MAX_HEIGHT)}px`;
        input.style.overflowY = height > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
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
    const canSend = Boolean(draft.trim()) && !chat.busy;

    return (
        <>
            <AnimatePresence initial={false}>
                {!open && (
                    <motion.div key="launcher" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING}>
                        <Button
                            ref={launcherRef as React.Ref<HTMLButtonElement>}
                            rounded
                            fit
                            size="md"
                            icon={LuSparkles}
                            onClick={() => setOpen(true)}
                            aria-haspopup="dialog"
                            aria-label={`Plan your shoot with ${CONCIERGE_NAME}, ContCave's AI assistant`}
                            className="h-12 min-w-12 px-3.5 text-sm sm:px-4"
                        >
                            <span className="hidden sm:inline">Plan my shoot</span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {mounted &&
                createPortal(
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
                                transition={SPRING}
                                style={{ transformOrigin: "bottom right" }}
                                className="fixed inset-0 z-[10000] flex flex-col bg-background sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(600px,calc(100dvh-2.5rem))] sm:w-[380px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border"
                            >
                                <header className="flex items-center gap-3 border-b border-border py-3 pl-5 pr-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
                                    <Mark size={32} />
                                    <div className="min-w-0 flex-1">
                                        <h2 id={titleId} className="text-base font-semibold leading-5 text-foreground">
                                            {CONCIERGE_NAME}
                                        </h2>
                                        <p className="truncate text-sm leading-5 text-muted-foreground">ContCave&apos;s AI booking assistant</p>
                                    </div>
                                    {!empty && (
                                        <Button
                                            variant="ghost"
                                            size="md"
                                            rounded
                                            icon={LuSquarePen}
                                            aria-label="Start a new chat"
                                            onClick={() => {
                                                chat.reset();
                                                setDraft("");
                                                inputRef.current?.focus();
                                            }}
                                        />
                                    )}
                                    <Button variant="ghost" size="md" rounded icon={LuX} aria-label="Close chat" onClick={() => setOpen(false)} />
                                </header>

                                <BriefStrip brief={chat.brief} />

                                <div
                                    ref={logRef}
                                    onScroll={onScroll}
                                    role="log"
                                    aria-live="polite"
                                    aria-relevant="additions"
                                    className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]"
                                >
                                    {empty ? (
                                        <Starters onPick={submit} />
                                    ) : (
                                        <ol className="space-y-6">
                                            {chat.messages.map((message) => (
                                                <li key={message.id}>
                                                    {message.role === "user" ? (
                                                        <p className="ml-auto w-fit max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-base leading-6 text-foreground">
                                                            {message.text}
                                                        </p>
                                                    ) : (
                                                        <AssistantReply text={message.text} cards={message.cards} status={null} streaming={false} onAsk={submit} disabled={chat.busy} />
                                                    )}
                                                </li>
                                            ))}
                                            {chat.pending && (
                                                <li>
                                                    <AssistantReply {...chat.pending} streaming onAsk={submit} disabled />
                                                </li>
                                            )}
                                            {chat.error && (
                                                <li role="alert">
                                                    <Callout icon={FiAlertCircle} title={chat.error} />
                                                </li>
                                            )}
                                        </ol>
                                    )}
                                </div>

                                <div className="space-y-2 border-t border-border px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                                    {chat.suggestions.length > 0 && !chat.busy && (
                                        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Suggested replies">
                                            {chat.suggestions.map((suggestion) => (
                                                <li key={suggestion} className="shrink-0">
                                                    <Button outline rounded fit label={suggestion} onClick={() => submit(suggestion)} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            submit(draft);
                                        }}
                                        className="relative"
                                    >
                                        <label htmlFor={inputId} className="sr-only">
                                            Message {CONCIERGE_NAME}
                                        </label>
                                        <Textarea
                                            id={inputId}
                                            ref={inputRef}
                                            rows={1}
                                            value={draft}
                                            maxLength={MAX_USER_MESSAGE_LENGTH}
                                            enterKeyHint="send"
                                            onChange={(event) => setDraft(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                                                    event.preventDefault();
                                                    submit(draft);
                                                }
                                            }}
                                            placeholder={chat.handedOff ? "Add anything else for the team" : `Message ${CONCIERGE_NAME}`}
                                            size="compact"
                                            className="block resize-none pr-12"
                                            style={{ maxHeight: COMPOSER_MAX_HEIGHT }}
                                        />
                                        <Button
                                            type="submit"
                                            rounded
                                            size="sm"
                                            isIconOnly
                                            icon={LuArrowUp}
                                            disabled={!canSend}
                                            aria-label="Send message"
                                            className={cn("absolute bottom-1 right-1", !canSend && "bg-muted border-muted text-muted-foreground opacity-100")}
                                        />
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    );
}
