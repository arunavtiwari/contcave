"use client";
import { addDays, startOfToday } from "date-fns";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FiSliders } from "react-icons/fi";

import TaxonomyPillSelect from "@/components/inputs/TaxonomyPillSelect";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Switch from "@/components/ui/Switch";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { useStudioSearch } from "@/hooks/useStudioSearch";
import useUIStore from "@/hooks/useUIStore";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/dayAvailability";
import { AESTHETICS, SET_FEATURES, USE_CASES } from "@/lib/taxonomy";

const TAG_FILTERS = [
  { key: "type", label: "Shoot type", vocab: USE_CASES },
  { key: "aesthetics", label: "Aesthetics", vocab: AESTHETICS },
] as const;

const SET_FEATURE_GROUPS = Array.from(new Set(SET_FEATURES.map((feature) => feature.group ?? "Other"))).map((group) => ({
  group,
  vocab: SET_FEATURES.filter((feature) => (feature.group ?? "Other") === group),
}));

type TagKey = (typeof TAG_FILTERS)[number]["key"] | "setFeatures";

type Draft = {
  tags: Record<TagKey, string[]>;
  date: string | null;
  hasSets: boolean;
};

const TAG_KEYS: TagKey[] = [...TAG_FILTERS.map((filter) => filter.key), "setFeatures"];
const DATE_PARAMS = ["date", "selectedDate", "startDate", "endDate"];
const RETIRED_PARAMS = ["venueTypes"];
const RESET_PARAMS = [...TAG_KEYS, ...DATE_PARAMS, ...RETIRED_PARAMS, "hasSets"];

type Props = { city?: string };

const FilterModalContent = ({ city }: Props) => {
  const { navigate } = useFilterNavigation();
  const params = useSearchParams();
  const active = useStudioSearch();
  const uiStore = useUIStore();
  const isOpen = uiStore.modals.filter;
  const setIsOpen = (open: boolean) => (open ? uiStore.onOpen("filter") : uiStore.onClose("filter"));
  const today = useMemo(() => startOfToday(), []);
  const lastBookableDay = useMemo(() => addDays(today, BOOKING_HORIZON_DAYS), [today]);

  const appliedTags = useMemo(
    () => Object.fromEntries(TAG_KEYS.map((key) => [key, params?.get(key)?.split(",").filter(Boolean) ?? []])) as Draft["tags"],
    [params]
  );

  const [draft, setDraft] = useState<Draft>({ tags: appliedTags, date: null, hasSets: false });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateTags = (key: TagKey, values: string[]) => setDraft((current) => ({ ...current, tags: { ...current.tags, [key]: values } }));

  useEffect(() => {
    if (!isOpen) return;
    setDraft({ tags: appliedTags, date: active.date, hasSets: active.hasSets });
  }, [isOpen, appliedTags, active.date, active.hasSets]);

  const activeFilterCount = [
    ...TAG_KEYS.map((key) => appliedTags[key].length > 0),
    Boolean(active.date),
    active.hasSets,
  ].filter(Boolean).length;

  const urlSearchParams = useMemo(() => {
    const next = new URLSearchParams(params ? Array.from(params.entries()) : []);
    if (city && !next.has("locationValue")) next.set("locationValue", city);
    return next;
  }, [params, city]);

  const handleApplyFilters = () => {
    const next = new URLSearchParams(urlSearchParams.toString());

    for (const key of TAG_KEYS) {
      if (draft.tags[key].length > 0) next.set(key, draft.tags[key].join(","));
      else next.delete(key);
    }
    RETIRED_PARAMS.forEach((key) => next.delete(key));

    DATE_PARAMS.forEach((key) => next.delete(key));
    if (draft.date) next.set("date", draft.date);

    if (draft.hasSets) next.set("hasSets", "true");
    else next.delete("hasSets");

    navigate(`/studios?${next.toString()}`);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams(urlSearchParams.toString());
    RESET_PARAMS.forEach((key) => next.delete(key));
    navigate(`/studios?${next.toString()}`);
    setIsOpen(false);
  };

  const body = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <DatePicker
          id="filter-date"
          label="Date"
          description="Only show studios with a free slot that day"
          placeholder="Any date"
          value={draft.date}
          minDate={today}
          maxDate={lastBookableDay}
          onChange={(date) => update({ date })}
        />
        {draft.date && (
          <Button label="Clear date" variant="ghost" fit onClick={() => update({ date: null })} className="h-auto px-0 text-muted-foreground hover:text-foreground" />
        )}
      </div>

      <Switch
        label="Multi-set studios"
        description="Only show studios with multiple sets"
        variant="horizontal"
        childWidth="auto"
        checked={draft.hasSets}
        onChange={(hasSets) => update({ hasSets })}
      />

      {TAG_FILTERS.map(({ key, label, vocab }) => (
        <TaxonomyPillSelect key={key} label={label} vocab={vocab} value={draft.tags[key]} onChange={(values) => updateTags(key, values)} />
      ))}

      {SET_FEATURE_GROUPS.map(({ group, vocab }) => (
        <TaxonomyPillSelect
          key={group}
          label={group}
          vocab={vocab}
          value={draft.tags.setFeatures.filter((label) => vocab.some((item) => item.label === label))}
          onChange={(values) => updateTags("setFeatures", [
            ...draft.tags.setFeatures.filter((label) => !vocab.some((item) => item.label === label)),
            ...values,
          ])}
        />
      ))}
    </div>
  );

  return (
    <div className="shrink-0">
      <Button
        label="Filters"
        icon={FiSliders}
        variant="ghost"
        size="sm"
        fit
        onClick={() => setIsOpen(true)}
        className="bg-muted border border-border hover:bg-muted/80 h-9 px-3 gap-1.5 font-medium"
      >
        {activeFilterCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </Button>

      <Modal
        isOpen={isOpen}
        onCloseAction={() => setIsOpen(false)}
        onSubmitAction={handleApplyFilters}
        title="Filters"
        body={body}
        actionLabel="Apply"
        secondaryActionAction={handleResetFilters}
        secondaryActionLabel="Reset"
        customWidth="w-full max-w-lg"
      />
    </div>
  );
};

const FilterModal = ({ city }: Props) => {
  return (
    <Suspense fallback={
      <div className="shrink-0">
        <Button
          label="Filters"
          icon={FiSliders}
          variant="ghost"
          size="sm"
          fit
          className="bg-muted border border-border opacity-50 h-9 px-3 gap-1.5 font-medium"
          disabled
        />
      </div>
    }>
      <FilterModalContent city={city} />
    </Suspense>
  );
};

export default FilterModal;
