"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { spaceTypes } from "@/constants/spaceTypes";
import useIndianCities from "@/hook/useCities";
import CitySelect from "@/components/inputs/CitySelect";
import Modal from "./Modal";

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
            <button
              key={spaceType}
              type="button"
              onClick={() =>
                setSelectedType((prev) => (prev === spaceType ? null : spaceType))
              }
              className={`px-3 py-1 rounded-full border text-sm ${selectedType === spaceType
                ? "bg-black text-white border-black"
                : "border-gray-300 hover:bg-gray-100"
                }`}
            >
              {spaceType}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="shrink-0">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gray-100 rounded-lg text-sm whitespace-nowrap"
      >
        More Filters
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleApplyFilters}
        title="More Filters"
        body={body}
        actionLabel="Apply"
        secondaryAction={handleResetFilters}
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
        <button className="px-4 py-2 bg-gray-100 rounded-lg text-sm whitespace-nowrap">
          More Filters
        </button>
      </div>
    }>
      <FilterModalContent />
    </Suspense>
  );
};

export default FilterModal;
