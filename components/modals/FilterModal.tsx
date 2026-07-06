"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import CitySelect from "@/components/inputs/CitySelect";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import useIndianCities from "@/hooks/useCities";
import { AESTHETICS, SET_FEATURES, USE_CASES, VENUE_TYPES } from "@/lib/taxonomy";

const FilterModalContent = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { getByValue } = useIndianCities();
  const [isOpen, setIsOpen] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<string[]>([]);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [selectedSetFeatures, setSelectedSetFeatures] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTypes(params?.get("type") ? params.get("type")!.split(",") : []);
    setSelectedVenueTypes(params?.get("venueTypes") ? params.get("venueTypes")!.split(",") : []);
    setSelectedAesthetics(params?.get("aesthetics") ? params.get("aesthetics")!.split(",") : []);
    setSelectedSetFeatures(params?.get("setFeatures") ? params.get("setFeatures")!.split(",") : []);
    setSelectedCity(params?.get("locationValue") ?? null);
  }, [params]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTypes.length > 0) count++;
    if (selectedVenueTypes.length > 0) count++;
    if (selectedAesthetics.length > 0) count++;
    if (selectedSetFeatures.length > 0) count++;
    if (selectedCity) count++;
    return count;
  }, [selectedTypes, selectedVenueTypes, selectedAesthetics, selectedSetFeatures, selectedCity]);

  const urlSearchParams = useMemo(() => {
    return new URLSearchParams(params ? Array.from(params.entries()) : []);
  }, [params]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleApplyFilters = () => {
    const nextParams = new URLSearchParams(urlSearchParams.toString());

    if (selectedTypes.length > 0) nextParams.set("type", selectedTypes.join(","));
    else nextParams.delete("type");

    if (selectedVenueTypes.length > 0) nextParams.set("venueTypes", selectedVenueTypes.join(","));
    else nextParams.delete("venueTypes");

    if (selectedAesthetics.length > 0) nextParams.set("aesthetics", selectedAesthetics.join(","));
    else nextParams.delete("aesthetics");

    if (selectedSetFeatures.length > 0) nextParams.set("setFeatures", selectedSetFeatures.join(","));
    else nextParams.delete("setFeatures");

    if (selectedCity) nextParams.set("locationValue", selectedCity);
    else nextParams.delete("locationValue");

    router.push(`?${nextParams.toString()}`);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const nextParams = new URLSearchParams(urlSearchParams.toString());
    ["type", "venueTypes", "aesthetics", "setFeatures", "locationValue"].forEach((k) => nextParams.delete(k));
    setSelectedTypes([]);
    setSelectedVenueTypes([]);
    setSelectedAesthetics([]);
    setSelectedSetFeatures([]);
    setSelectedCity(null);
    router.push(`?${nextParams.toString()}`);
    setIsOpen(false);
  };

  const selectedCityOption = selectedCity ? getByValue(selectedCity) : undefined;

  const body = (
    <div className="divide-y divide-border">
      <section className="pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">City</p>
        <CitySelect
          value={selectedCityOption}
          onChange={(value) => setSelectedCity(value?.value ?? null)}
        />
      </section>

      <section className="py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Shoot Type</p>
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <Pill
              key={u.slug}
              label={u.label}
              variant={selectedTypes.includes(u.label) ? "solid" : "secondary"}
              onClick={() => toggle(u.label, selectedTypes, setSelectedTypes)}
            />
          ))}
        </div>
      </section>

      <section className="py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Venue Type</p>
        <div className="flex flex-wrap gap-2">
          {VENUE_TYPES.map((v) => (
            <Pill
              key={v.slug}
              label={v.label}
              variant={selectedVenueTypes.includes(v.label) ? "solid" : "secondary"}
              onClick={() => toggle(v.label, selectedVenueTypes, setSelectedVenueTypes)}
            />
          ))}
        </div>
      </section>

      <section className="py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aesthetics</p>
        <div className="flex flex-wrap gap-2">
          {AESTHETICS.map((a) => (
            <Pill
              key={a.slug}
              label={a.label}
              variant={selectedAesthetics.includes(a.label) ? "solid" : "secondary"}
              onClick={() => toggle(a.label, selectedAesthetics, setSelectedAesthetics)}
            />
          ))}
        </div>
      </section>

      <section className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Space Features</p>
        <div className="flex flex-wrap gap-2">
          {SET_FEATURES.map((f) => (
            <Pill
              key={f.slug}
              label={f.label}
              variant={selectedSetFeatures.includes(f.label) ? "solid" : "secondary"}
              onClick={() => toggle(f.label, selectedSetFeatures, setSelectedSetFeatures)}
            />
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="shrink-0">
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 border border-border transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

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

const FilterModal = () => {
  return (
    <Suspense fallback={
      <div className="shrink-0">
        <Button
          label="Filters"
          variant="ghost"
          size="sm"
          fit
          className="bg-muted border border-border opacity-50"
          disabled
        />
      </div>
    }>
      <FilterModalContent />
    </Suspense>
  );
};

export default FilterModal;
