"use client";

import { addDays, format, parseISO, startOfToday } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { Suspense, useMemo, useState } from "react";

import Calendar from "@/components/inputs/Calendar";
import Modal from "@/components/modals/Modal";
import AutoComplete from "@/components/ui/AutoComplete";
import Checkbox from "@/components/ui/Checkbox";
import Heading from "@/components/ui/Heading";
import { type SearchPlace, useStudioSearch } from "@/hooks/useStudioSearch";
import useUIStore from "@/hooks/useUIStore";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/dayAvailability";
import { formatLatLngParam, searchRadiusKm } from "@/lib/geo";

const Map = dynamic(() => import("@/components/map/Map"), { ssr: false });

enum STEPS {
  LOCATION = 0,
  DATE = 1,
}

const REPLACED_PARAMS = ["place", "near", "km", "locationValue", "date", "hasSets", "selectedDate", "startDate", "endDate"];

function SearchModalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const uiStore = useUIStore();
  const active = useStudioSearch();
  const isOpen = uiStore.modals.search;

  const [wasOpen, setWasOpen] = useState(isOpen);
  const [step, setStep] = useState(STEPS.LOCATION);
  const [where, setWhere] = useState<SearchPlace | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [hasSets, setHasSets] = useState(false);
  const today = useMemo(() => startOfToday(), []);
  const lastBookableDay = useMemo(() => addDays(today, BOOKING_HORIZON_DAYS), [today]);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setStep(STEPS.LOCATION);
      setWhere(active.place ?? (active.city
        ? { label: active.city.label, latlng: active.city.latlng as SearchPlace["latlng"], radiusKm: searchRadiusKm() }
        : null));
      setDate(active.date ? parseISO(active.date) : null);
      setHasSets(active.hasSets);
    }
  }

  const search = (next: { where: SearchPlace | null; date: Date | null; hasSets: boolean }) => {
    const query = qs.parse(params?.toString() ?? "");
    for (const key of REPLACED_PARAMS) delete query[key];

    const url = qs.stringifyUrl(
      {
        url: "/studios",
        query: {
          ...query,
          place: next.where?.label,
          near: next.where ? formatLatLngParam(next.where.latlng) : undefined,
          km: next.where?.radiusKm,
          date: next.date ? format(next.date, "yyyy-MM-dd") : undefined,
          hasSets: next.hasSets ? "true" : undefined,
        },
      },
      { skipNull: true, skipEmptyString: true }
    );

    uiStore.onClose("search");
    router.push(url);
  };

  const onSubmit = () => {
    if (step === STEPS.LOCATION) {
      setStep(STEPS.DATE);
      return;
    }
    search({ where, date, hasSets });
  };

  const canReset = Boolean(where || date || hasSets || active.whereLabel || active.date || active.hasSets);

  const bodyContent =
    step === STEPS.LOCATION ? (
      <div className="flex flex-col gap-8">
        <Heading title="Where do you wanna shoot?" subtitle="Find the perfect location!" />
        <AutoComplete
          value={where?.label ?? ""}
          placeholder="Search an area, city or landmark"
          enableNearby
          enableSuggestions
          onChange={(place) => setWhere({ label: place.name, latlng: place.latlng, radiusKm: searchRadiusKm(place.radiusKm) })}
          onClear={() => setWhere(null)}
        />
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="font-medium">Multi-set listings</div>
            <div className="font-light text-muted-foreground">Only show studios with multiple sets</div>
          </div>
          <Checkbox checked={hasSets} onCheckedChange={(checked) => setHasSets(checked)} />
        </div>
        <hr />
        <Map center={where?.latlng} />
      </div>
    ) : (
      <div className="flex flex-col gap-8">
        <Heading title="When do you want to shoot?" subtitle="We'll show studios with a free slot that day" />
        <Calendar value={date} minDate={today} maxDate={lastBookableDay} onChange={(value) => setDate(value ?? null)} />
        {date && (
          <button
            type="button"
            onClick={() => setDate(null)}
            className="self-start text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear date
          </button>
        )}
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={() => uiStore.onClose("search")}
      onSubmitAction={onSubmit}
      secondaryActionAction={
        step === STEPS.DATE
          ? () => setStep(STEPS.LOCATION)
          : canReset
            ? () => search({ where: null, date: null, hasSets: false })
            : undefined
      }
      secondaryActionLabel={step === STEPS.DATE ? "Back" : canReset ? "Reset" : undefined}
      title="Search"
      actionLabel={step === STEPS.LOCATION ? "Next" : "Search"}
      body={bodyContent}
    />
  );
}

export default function SearchModal() {
  return (
    <Suspense fallback={null}>
      <SearchModalContent />
    </Suspense>
  );
}
