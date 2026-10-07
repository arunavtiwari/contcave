"use client";
import { addDays, startOfToday } from "date-fns";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FiSliders } from "react-icons/fi";

import TaxonomyPillSelect from "@/components/inputs/TaxonomyPillSelect";
import Modal from "@/components/modals/Modal";
import AutoComplete from "@/components/ui/AutoComplete";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Switch from "@/components/ui/Switch";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { type SearchPlace, useStudioSearch } from "@/hooks/useStudioSearch";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/dayAvailability";
import { formatLatLngParam, searchRadiusKm } from "@/lib/geo";
import { AESTHETICS, SET_FEATURES, USE_CASES, VENUE_TYPES } from "@/lib/taxonomy";

const TAG_FILTERS = [
  { key: "type", label: "Shoot Type", vocab: USE_CASES },
  { key: "venueTypes", label: "Venue Type", vocab: VENUE_TYPES },
  { key: "aesthetics", label: "Aesthetics", vocab: AESTHETICS },
  { key: "setFeatures", label: "Space Features", vocab: SET_FEATURES },
] as const;

type TagKey = (typeof TAG_FILTERS)[number]["key"];

type Draft = {
  tags: Record<TagKey, string[]>;
  where?: SearchPlace | null;
  date: string | null;
  hasSets: boolean;
};

const PLACE_PARAMS = ["place", "near", "km"];
const DATE_PARAMS = ["date", "selectedDate", "startDate", "endDate"];
const RESET_PARAMS = [...TAG_FILTERS.map((filter) => filter.key), ...PLACE_PARAMS, ...DATE_PARAMS, "hasSets"];

type Props = { city?: string };

const FilterModalContent = ({ city }: Props) => {
  const { navigate } = useFilterNavigation();
  const params = useSearchParams();
  const active = useStudioSearch();
  const [isOpen, setIsOpen] = useState(false);
  const today = useMemo(() => startOfToday(), []);
  const lastBookableDay = useMemo(() => addDays(today, BOOKING_HORIZON_DAYS), [today]);

  const appliedTags = useMemo(
    () => Object.fromEntries(
      TAG_FILTERS.map(({ key }) => [key, params?.get(key)?.split(",").filter(Boolean) ?? []])
    ) as Draft["tags"],
    [params]
  );

  const [draft, setDraft] = useState<Draft>({ tags: appliedTags, date: null, hasSets: false });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const activeFilterCount = [
    ...TAG_FILTERS.map(({ key }) => appliedTags[key].length > 0),
    Boolean(active.place),
    Boolean(active.date),
    active.hasSets,
  ].filter(Boolean).length;

  const openFilters = () => {
    setDraft({ tags: appliedTags, where: undefined, date: active.date, hasSets: active.hasSets });
    setIsOpen(true);
  };

  const urlSearchParams = useMemo(() => {
    const next = new URLSearchParams(params ? Array.from(params.entries()) : []);
    if (city && !next.has("locationValue")) next.set("locationValue", city);
    return next;
  }, [params, city]);

  const handleApplyFilters = () => {
    const next = new URLSearchParams(urlSearchParams.toString());

    for (const { key } of TAG_FILTERS) {
      if (draft.tags[key].length > 0) next.set(key, draft.tags[key].join(","));
      else next.delete(key);
    }

    if (draft.where !== undefined) {
      [...PLACE_PARAMS, "locationValue"].forEach((key) => next.delete(key));
      if (draft.where) {
        next.set("place", draft.where.label);
        next.set("near", formatLatLngParam(draft.where.latlng));
        next.set("km", String(draft.where.radiusKm));
      }
    }

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
      <AutoComplete
        label="Location"
        value={draft.where === undefined ? active.whereLabel ?? "" : draft.where?.label ?? ""}
        placeholder="Search an area, city or landmark"
        enableNearby
        enableSuggestions
        onChange={(place) => update({ where: { label: place.name, latlng: place.latlng, radiusKm: searchRadiusKm(place.radiusKm) } })}
        onClear={() => update({ where: null })}
      />

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
        <TaxonomyPillSelect
          key={key}
          label={label}
          vocab={vocab}
          value={draft.tags[key]}
          onChange={(values) => update({ tags: { ...draft.tags, [key]: values } })}
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
        onClick={openFilters}
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
