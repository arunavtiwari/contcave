"use client";

import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { BiSearch } from "react-icons/bi";
import { IoArrowForward, IoSparkles, IoTimeOutline } from "react-icons/io5";

import { logSearchEventAction } from "@/app/actions/searchActions";
import type { ListingKind } from "@/components/listing/ListingTypeBadge";
import AiSearchResults, { type ResultOption, resultOptions } from "@/components/search/AiSearchResults";
import RefineBar from "@/components/search/RefineBar";
import SearchGroupHeading, { GROUP_LABELS } from "@/components/search/SearchGroupHeading";
import StudioThumb from "@/components/search/StudioThumb";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Kbd from "@/components/ui/Kbd";
import Pill from "@/components/ui/Pill";
import { useAiSearch } from "@/hooks/useAiSearch";
import useUIStore from "@/hooks/useUIStore";
import { SEARCH_CONFIG } from "@/lib/search/config";
import type { StudioSuggestion, SuggestResult } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const RECENT_KEY = "contcave.recentSearches";
const EMPTY_RESULT: SuggestResult = { understood: [], studios: [] };
const KEY_HINTS = [
    { keys: ["↑", "↓"], label: "Navigate" },
    { keys: ["↵"], label: "Select" },
];
const ICON_TILE = "flex size-10 shrink-0 items-center justify-center rounded-lg";

type SuggestOption =
    | { kind: "search"; id: string; query: string }
    | { kind: "query"; id: string; query: string; recent: boolean }
    | { kind: "studio"; id: string; studio: StudioSuggestion };

type Option = SuggestOption | ResultOption;

type OptionGroup = {
    key: string;
    label: string;
    showLabel: boolean;
    badge?: ListingKind;
    options: SuggestOption[];
    action?: { label: string; onClick: () => void };
};

function readRecent(): string[] {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
        return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

function writeRecent(items: string[]) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {
        return;
    }
}

const isTypingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export default function SpotlightSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const isOpen = useUIStore((state) => state.modals.spotlight);
    const onOpen = useUIStore((state) => state.onOpen);
    const onClose = useUIStore((state) => state.onClose);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pathRef = useRef(pathname);
    const inputId = useId();
    const listId = useId();
    const titleId = useId();

    const [query, setQuery] = useState("");
    const [result, setResult] = useState<SuggestResult>(EMPTY_RESULT);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const { state: aiState, run: runAi, reset: resetAi } = useAiSearch();
    const inResults = aiState.status !== "idle";

    const open = useCallback(() => onOpen("spotlight"), [onOpen]);
    const close = useCallback(() => onClose("spotlight"), [onClose]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isShortcut = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
            const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target);
            if (!isShortcut && !isSlash) return;
            event.preventDefault();
            open();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    useEffect(() => {
        if (pathRef.current === pathname) return;
        pathRef.current = pathname;
        close();
    }, [pathname, close]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen && !dialog.open) {
            setQuery("");
            setResult(EMPTY_RESULT);
            setActiveIndex(0);
            setRecent(readRecent());
            resetAi();
            dialog.showModal();
            document.documentElement.style.overflow = "hidden";
            inputRef.current?.focus();
        }
        if (!isOpen && dialog.open) dialog.close();
        if (!isOpen) document.documentElement.style.overflow = "";
    }, [isOpen, resetAi]);

    const trimmed = query.trim();
    const hasQuery = trimmed.length >= SEARCH_CONFIG.suggest.minChars;

    useEffect(() => {
        if (!hasQuery || inResults) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setLoading(true);
            fetch(`/api/search/suggest?${new URLSearchParams({ q: trimmed })}`, { signal: controller.signal })
                .then((response) => (response.ok ? response.json() : null))
                .then((body: { data?: SuggestResult } | null) => {
                    if (body?.data) setResult(body.data);
                })
                .catch(() => undefined)
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, SEARCH_CONFIG.suggest.debounceMs);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [trimmed, hasQuery, inResults]);

    const clearRecent = useCallback(() => {
        writeRecent([]);
        setRecent([]);
        setActiveIndex(0);
        inputRef.current?.focus();
    }, []);

    const groups = useMemo<OptionGroup[]>(() => {
        if (!hasQuery) {
            return [
                {
                    key: "recent",
                    label: "Recent",
                    showLabel: true,
                    options: recent.map((item, index) => ({ kind: "query" as const, id: `recent-${index}`, query: item, recent: true })),
                    action: { label: "Clear", onClick: clearRecent },
                },
                {
                    key: "examples",
                    label: "Try asking",
                    showLabel: true,
                    options: SEARCH_CONFIG.examples.map((item, index) => ({ kind: "query" as const, id: `example-${index}`, query: item, recent: false })),
                },
            ].filter((group) => group.options.length > 0);
        }
        const studios = (curated: boolean) => result.studios
            .filter((studio) => studio.curated === curated)
            .map((studio) => ({ kind: "studio" as const, id: `studio-${studio.id}`, studio }));
        return [
            { key: "ai", label: "AI search", showLabel: false, options: [{ kind: "search" as const, id: "search", query: trimmed }] },
            { key: "verified", label: GROUP_LABELS.bookable, showLabel: true, badge: "STANDARD" as const, options: studios(false) },
            { key: "curated", label: GROUP_LABELS.curated, showLabel: true, badge: "CURATED" as const, options: studios(true) },
        ].filter((group) => group.options.length > 0);
    }, [hasQuery, recent, clearRecent, result.studios, trimmed]);

    const results = useMemo(() => resultOptions(aiState), [aiState]);
    const options = useMemo<Option[]>(() => (inResults ? results : groups.flatMap((group) => group.options)), [inResults, results, groups]);
    const active = options[Math.min(activeIndex, options.length - 1)];
    const optionDomId = useCallback((option: Option) => `${listId}-${option.id}`, [listId]);

    useEffect(() => {
        if (active) document.getElementById(optionDomId(active))?.scrollIntoView({ block: "nearest" });
    }, [active, optionDomId]);

    const navigateTo = (href: string) => {
        close();
        router.push(href);
    };

    const runSearch = (text: string) => {
        const value = text.trim();
        if (!value) return;
        writeRecent([value, ...readRecent().filter((item) => item !== value)].slice(0, SEARCH_CONFIG.suggest.recentLimit));
        setQuery(value);
        setActiveIndex(0);
        void runAi({ query: value, params: {} });
    };

    const applyParams = (params: Record<string, string>) => {
        if (aiState.status === "idle") return;
        setActiveIndex(0);
        void runAi({ query: aiState.request.query, params: { ...aiState.request.params, ...params } });
    };

    const choose = (option: Option | undefined) => {
        if (!option) return runSearch(trimmed);
        if (option.kind === "studio") return navigateTo(option.studio.href);
        if (option.kind === "result") {
            if (aiState.status === "done") void logSearchEventAction({ sessionToken: aiState.sessionToken, type: "click", listingId: option.view.id });
            return navigateTo(option.view.href);
        }
        runSearch(option.query);
    };

    const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!options.length) return;
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (Math.min(index, options.length - 1) + step + options.length) % options.length);
        }
        if (event.key === "Enter") {
            event.preventDefault();
            choose(active);
        }
    };

    const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) close();
    };

    const optionProps = (option: Option, className?: string) => {
        const selected = option.id === active?.id;
        return {
            id: optionDomId(option),
            role: "option",
            "aria-selected": selected,
            onPointerMove: () => {
                if (!selected) setActiveIndex(options.findIndex((item) => item.id === option.id));
            },
            onMouseDown: (event: MouseEvent) => event.preventDefault(),
            onClick: () => choose(option),
            className: cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors", selected && "bg-muted", className),
        };
    };

    const enterHint = (selected: boolean) => (
        <Kbd className={cn("hidden transition-opacity pointer-fine:inline-flex", selected ? "opacity-100" : "opacity-0")}>↵</Kbd>
    );

    const renderSuggestion = (option: SuggestOption, selected: boolean) => {
        if (option.kind === "studio") {
            const { studio } = option;
            return (
                <>
                    <StudioThumb image={studio.image} />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{studio.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{studio.subtitle}</span>
                    </span>
                    {studio.price && <span className="shrink-0 text-xs font-medium text-foreground">{studio.price}</span>}
                </>
            );
        }

        if (option.kind === "search") {
            return (
                <>
                    <span className={cn(ICON_TILE, "border border-border bg-background text-foreground")}>
                        <IoSparkles size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                            Search <span className="font-medium">“{option.query}”</span> with AI
                        </span>
                        {result.understood.length > 0 ? (
                            <span className="mt-1.5 flex flex-wrap gap-1">
                                {result.understood.map((value) => (
                                    <Pill key={value} size="xs" variant="outline" label={value} className="rounded-full px-2 text-foreground/70 tracking-normal" />
                                ))}
                            </span>
                        ) : (
                            <span className="block truncate text-xs text-muted-foreground">Matches your date, budget, crew and space needs</span>
                        )}
                    </span>
                    {enterHint(selected)}
                </>
            );
        }

        return (
            <>
                <span className={cn(ICON_TILE, "border border-border bg-background text-foreground")}>
                    {option.recent ? <IoTimeOutline size={18} aria-hidden /> : <BiSearch size={18} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{option.query}</span>
                {enterHint(selected)}
            </>
        );
    };

    const busy = aiState.status === "loading" || (!inResults && loading && hasQuery);
    const resultsView = aiState.status === "done" && aiState.view.state === "results" ? aiState.view : null;
    const announcement = aiState.status === "loading"
        ? "Searching studios"
        : inResults ? `${results.length} studios found` : hasQuery ? `${result.studios.length} studios suggested` : "";

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onClose={close}
            onClick={onDialogClick}
            className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-foreground/20 backdrop:backdrop-blur-[2px] sm:p-6"
        >
            <div className="flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:mx-auto sm:mt-[10vh] sm:h-auto sm:max-h-[min(44rem,80dvh)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border">
                <h2 id={titleId} className="sr-only">Search studios</h2>

                <div className="border-b border-border px-1.5">
                    <Input
                        ref={inputRef}
                        id={inputId}
                        size="lg"
                        role="combobox"
                        enterKeyHint="search"
                        inputMode="search"
                        autoComplete="off"
                        aria-expanded={options.length > 0}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={active ? optionDomId(active) : undefined}
                        aria-label={SEARCH_CONFIG.prompt}
                        placeholder={`${SEARCH_CONFIG.prompt}…`}
                        value={query}
                        maxLength={SEARCH_CONFIG.maxQueryLength}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                            if (inResults) resetAi();
                            if (event.target.value.trim().length < SEARCH_CONFIG.suggest.minChars) setResult(EMPTY_RESULT);
                        }}
                        onKeyDown={onInputKeyDown}
                        customLeftContent={(
                            <span className="flex size-10 items-center justify-center text-foreground">
                                {inResults ? <IoSparkles size={18} aria-hidden /> : <BiSearch size={20} aria-hidden />}
                            </span>
                        )}
                        customRightContent={(
                            <span className="flex items-center gap-3">
                                {busy && <AiOutlineLoading3Quarters className="animate-spin text-muted-foreground" aria-hidden />}
                                <Button variant="ghost" fit onClick={close} aria-label="Close search" className="hidden h-auto px-0 pointer-fine:flex">
                                    <Kbd>esc</Kbd>
                                </Button>
                                <Button label="Cancel" variant="ghost" fit onClick={close} className="h-auto px-0 pointer-fine:hidden" />
                            </span>
                        )}
                        className="h-16 rounded-none border-0 bg-transparent focus-within:ring-0"
                    />
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {aiState.status !== "idle" ? (
                        <AiSearchResults
                            state={aiState}
                            options={results}
                            listId={listId}
                            optionProps={optionProps}
                            onApply={applyParams}
                            onRetry={() => void runAi(aiState.request)}
                        />
                    ) : (
                        <div id={listId} role="listbox" aria-label="Search suggestions" className="p-2">
                            {groups.map((group) => (
                                <div key={group.key} role="group" aria-label={group.label} className="pb-1">
                                    {group.showLabel && (
                                        <SearchGroupHeading
                                            id={`${listId}-${group.key}-heading`}
                                            label={group.label}
                                            badge={group.badge}
                                            action={group.action && (
                                                <Button
                                                    label={group.action.label}
                                                    variant="ghost"
                                                    fit
                                                    onClick={group.action.onClick}
                                                    className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                                                />
                                            )}
                                        />
                                    )}
                                    {group.options.map((option) => (
                                        <div key={option.id} {...optionProps(option)}>
                                            {renderSuggestion(option, option.id === active?.id)}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="sr-only" aria-live="polite">{announcement}</p>

                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                    {resultsView && aiState.status === "done" ? (
                        <RefineBar key={aiState.sessionToken} parsed={resultsView.parsed} onRefine={applyParams} />
                    ) : (
                        <>
                            <div className="hidden items-center gap-4 text-xs text-muted-foreground pointer-fine:flex">
                                {KEY_HINTS.map((hint) => (
                                    <span key={hint.label} className="flex items-center gap-1.5">
                                        {hint.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
                                        {hint.label}
                                    </span>
                                ))}
                            </div>
                            <Button variant="ghost" fit onClick={() => navigateTo("/studios")} className="ml-auto h-auto gap-1.5 px-0 text-xs text-foreground hover:underline">
                                Browse all studios
                                <IoArrowForward aria-hidden />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </dialog>
    );
}
