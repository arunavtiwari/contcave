"use client";

import type { HTMLAttributes } from "react";
import { IoAlertCircleOutline, IoHelpCircleOutline, IoInformationCircleOutline, IoSparkles } from "react-icons/io5";

import CityQuestion from "@/components/search/CityQuestion";
import HandoffCallout from "@/components/search/HandoffCallout";
import QueryChips from "@/components/search/QueryChips";
import ReasonList from "@/components/search/ReasonList";
import SearchGroupHeading, { GROUP_LABELS } from "@/components/search/SearchGroupHeading";
import StudioThumb from "@/components/search/StudioThumb";
import Button from "@/components/ui/Button";
import Callout from "@/components/ui/Callout";
import Pill from "@/components/ui/Pill";
import Skeleton from "@/components/ui/Skeleton";
import WhatsAppLinkButton from "@/components/ui/WhatsAppLinkButton";
import type { AiSearchState } from "@/hooks/useAiSearch";
import { querySummary } from "@/lib/search/explain";
import type { ResultView, SearchView } from "@/lib/search/types";
import { buildWhatsAppUrl, GENERAL_ENQUIRY_MESSAGE } from "@/lib/whatsapp/urls";
import { overridesToParams } from "@/schemas/search";

const MAX_REASONS = 2;
const SKELETON_ROWS = 3;
const GROUP_ORDER = ["match", "closest", "curated"] as const;

type ResultGroup = (typeof GROUP_ORDER)[number];

export type ResultOption = { kind: "result"; id: string; group: ResultGroup; view: ResultView };

export function resultOptions(state: AiSearchState): ResultOption[] {
    if (state.status !== "done" || state.view.state !== "results") return [];
    const toOption = (group: ResultGroup) => (view: ResultView): ResultOption => ({ kind: "result", id: `result-${view.id}`, group, view });
    return [
        ...state.view.results.filter((view) => !view.fallback).map(toOption("match")),
        ...state.view.results.filter((view) => view.fallback).map(toOption("closest")),
        ...state.view.curated.map(toOption("curated")),
    ];
}

type ResultsView = Extract<SearchView, { state: "results" }>;

const groupTitle = (group: ResultGroup, view: ResultsView, count: number) => {
    if (group === "closest") return "Closest options";
    if (group === "curated") return GROUP_LABELS.curated;
    const place = `${view.nearby ? "near" : "in"} ${view.cityLabel}`;
    if (!count) return `No exact matches ${place}`;
    return `${count} ${count === 1 ? "studio fits" : "studios fit"} your shoot ${place}`;
};

type OptionProps = HTMLAttributes<HTMLDivElement> & { id: string };

type AiSearchResultsProps = {
    state: Exclude<AiSearchState, { status: "idle" }>;
    options: ResultOption[];
    listId: string;
    optionProps: (option: ResultOption, className?: string) => OptionProps;
    onApply: (params: Record<string, string>) => void;
    onRetry: () => void;
};

function ResultRow({ view, reasons, props }: { view: ResultView; reasons: string[]; props: OptionProps }) {
    const subtitle = [
        view.location,
        view.setName && `Best fit: ${view.setName}`,
        view.rating && `★ ${view.rating.toFixed(1)} (${view.reviewCount})`,
    ].filter(Boolean).join(" · ");

    return (
        <div {...props}>
            <StudioThumb image={view.image} className="size-14 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{view.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                </div>
                {(view.estimate || view.availability) && (
                    <p className="text-xs text-muted-foreground">
                        {view.estimate && <span className="font-medium text-foreground">{view.estimate}</span>}
                        {view.estimate && view.availability && " · "}
                        {view.availability}
                    </p>
                )}
                {view.packageNote && <p className="text-xs text-muted-foreground">{view.packageNote}</p>}
                <ReasonList items={reasons.slice(0, MAX_REASONS)} />
                {view.caveats.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {view.caveats.map((caveat) => <Pill key={caveat} size="xs" variant="warning" label={caveat} className="tracking-normal" />)}
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingRows() {
    return (
        <div className="space-y-1 p-2" aria-busy="true">
            <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                <IoSparkles className="animate-pulse text-foreground" aria-hidden />
                Finding studios that fit your shoot…
            </p>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <div key={index} className="flex gap-3 px-3 py-2">
                    <Skeleton className="size-14 rounded-xl" />
                    <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-3.5 w-1/2 rounded-md" />
                        <Skeleton className="h-3 w-3/4 rounded-md" />
                        <Skeleton className="h-3 w-2/5 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function HelpCallout() {
    return (
        <Callout
            title="That looks like a question rather than a studio search"
            icon={IoHelpCircleOutline}
            action={(
                <div className="flex flex-col gap-2 sm:flex-row">
                    <WhatsAppLinkButton href={buildWhatsAppUrl(GENERAL_ENQUIRY_MESSAGE)} label="Chat with ContCave" className="sm:w-auto" />
                    <Button href="/studios" label="Browse all studios" variant="outline" className="sm:w-auto" />
                </div>
            )}
        >
            Describe your shoot, for example the city, date, number of people and what the space needs, and we will find studios that fit.
        </Callout>
    );
}

export default function AiSearchResults({ state, options, listId, optionProps, onApply, onRetry }: AiSearchResultsProps) {
    if (state.status === "loading") return <LoadingRows />;
    if (state.status === "error") {
        return (
            <div className="p-2">
                <Callout title={state.message} icon={IoAlertCircleOutline} action={<Button label="Try again" size="sm" rounded fit onClick={onRetry} />} />
            </div>
        );
    }

    const { view, sessionToken, reasons } = state;
    if (view.state === "help") return <div className="p-2"><HelpCallout /></div>;

    const summary = querySummary(view.parsed);

    return (
        <div className="space-y-4 p-2">
            <div className="px-1 pt-1">
                <QueryChips key={sessionToken} parsed={view.parsed} cityOptions={view.cityOptions} onApply={onApply} />
            </div>

            {view.state === "needCity" && (
                <CityQuestion cityOptions={view.cityOptions} suggestedCity={view.suggestedCity} onSelect={(city) => onApply(overridesToParams({ city }))} />
            )}

            {view.state === "notCovered" && (
                <HandoffCallout title={`We don't list studios in ${view.city} yet`} summary={summary} sessionToken={sessionToken} />
            )}

            {view.state === "results" && (
                <>
                    {view.notices.map((notice) => (
                        <p key={notice} className="flex items-start gap-1.5 px-2 text-xs text-muted-foreground">
                            <IoInformationCircleOutline className="mt-px shrink-0" aria-hidden />
                            {notice}
                        </p>
                    ))}
                    <div id={listId} role="listbox" aria-label="AI search results">
                        {GROUP_ORDER.map((group) => {
                            const items = options.filter((option) => option.group === group);
                            if (!items.length && group !== "match") return null;
                            const headingId = `${listId}-${group}-heading`;
                            return (
                                <div key={group} role="group" aria-labelledby={headingId}>
                                    <SearchGroupHeading
                                        id={headingId}
                                        label={groupTitle(group, view, items.length)}
                                        badge={group === "curated" ? "CURATED" : "STANDARD"}
                                    />
                                    {items.map((option) => (
                                        <ResultRow
                                            key={option.id}
                                            view={option.view}
                                            reasons={reasons[option.view.id] ?? option.view.reasons}
                                            props={optionProps(option, "items-start")}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                    {view.offerHandoff && <HandoffCallout summary={summary} sessionToken={sessionToken} />}
                </>
            )}
        </div>
    );
}
