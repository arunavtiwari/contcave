"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import CitySelect from "@/components/inputs/CitySelect";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import { spaceTypes } from "@/constants/spaceTypes";
import useIndianCities from "@/hooks/useCities";

const FilterModalContent = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { getByValue } = useIndianCities();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(
    params?.get("type") ?? null,
  );
  const [selectedCity, setSelectedCity] = useState<string | null>(
    params?.get("locationValue") ?? null,
  );

  useEffect(() => {
    setSelectedType(params?.get("type") ?? null);
    setSelectedCity(params?.get("locationValue") ?? null);
  }, [params]);

  const urlSearchParams = useMemo(() => {
    return new URLSearchParams(params ? Array.from(params.entries()) : []);
  }, [params]);

  const handleApplyFilters = () => {
    const nextParams = new URLSearchParams(urlSearchParams.toString());

    if (selectedType) {
      nextParams.set("type", selectedType);
    } else {
      nextParams.delete("type");
    }

    if (selectedCity) {
      nextParams.set("locationValue", selectedCity);
    } else {
      nextParams.delete("locationValue");
    }

    router.push(`?${nextParams.toString()}`);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const nextParams = new URLSearchParams(urlSearchParams.toString());
    nextParams.delete("type");
    nextParams.delete("locationValue");
    setSelectedType(null);
    setSelectedCity(null);
    router.push(`?${nextParams.toString()}`);
    setIsOpen(false);
  };

  const selectedCityOption = selectedCity ? getByValue(selectedCity) : undefined;

  const body = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">City</label>
        <CitySelect
          value={selectedCityOption}
          onChange={(value) => setSelectedCity(value?.value ?? null)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="flex flex-wrap gap-2">
          {spaceTypes.map((spaceType) => (
            <Button
              key={spaceType}
              onClick={() =>
                setSelectedType((prev) => (prev === spaceType ? null : spaceType))
              }
              variant={selectedType === spaceType ? "default" : "outline"}
              label={spaceType}
              size="sm"
              fit
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="shrink-0">
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        label="More Filters"
        size="sm"
        fit
        classNames="bg-muted hover:bg-muted/80 border border-border"
      />

      <Modal
        isOpen={isOpen}
        onCloseAction={() => setIsOpen(false)}
        onSubmitAction={handleApplyFilters}
        title="More Filters"
        body={body}
        actionLabel="Apply"
        secondaryActionAction={handleResetFilters}
        secondaryActionLabel="Reset Filters"
        customWidth="w-full max-w-md"
      />
    </div>
  );
};

const FilterModal = () => {
  return (
    <Suspense fallback={
      <div className="shrink-0">
        <Button
          label="More Filters"
          variant="ghost"
          size="sm"
          fit
          classNames="bg-muted border border-border opacity-50"
          disabled
        />
      </div>
    }>
      <FilterModalContent />
    </Suspense>
  );
};

export default FilterModal;

