"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FiSliders } from "react-icons/fi";

import CitySelect from "@/components/inputs/CitySelect";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import useIndianCities from "@/hooks/useCities";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { AESTHETICS, SET_FEATURES, USE_CASES, VENUE_TYPES } from "@/lib/taxonomy";

type Props = { city?: string };

const FilterModalContent = ({ city }: Props) => {
  const { navigate } = useFilterNavigation();
  const params = useSearchParams();
  const { getByValue } = useIndianCities();
  const [isOpen, setIsOpen] = useState(false);

  const applied = useMemo(() => {
    const list = (key: string) => params?.get(key)?.split(",").filter(Boolean) ?? [];
    return {
      types: list("type"),
      venueTypes: list("venueTypes"),
      aesthetics: list("aesthetics"),
      setFeatures: list("setFeatures"),
      city: params?.get("locationValue") ?? city ?? null,
    };
  }, [params, city]);

  const activeFilterCount = [
    applied.types.length > 0,
    applied.venueTypes.length > 0,
    applied.aesthetics.length > 0,
    applied.setFeatures.length > 0,
    Boolean(applied.city),
  ].filter(Boolean).length;

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<string[]>([]);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [selectedSetFeatures, setSelectedSetFeatures] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const openFilters = () => {
    setSelectedTypes(applied.types);
    setSelectedVenueTypes(applied.venueTypes);
    setSelectedAesthetics(applied.aesthetics);
    setSelectedSetFeatures(applied.setFeatures);
    setSelectedCity(applied.city);
    setIsOpen(true);
  };

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

    navigate(`/studios?${nextParams.toString()}`);
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
    navigate(`/studios?${nextParams.toString()}`);
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
