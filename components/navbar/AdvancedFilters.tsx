"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const aesthetics = [
  "Minimalist",
  "Bohemian",
  "Luxury",
  "Rustic/Vintage",
  "Futuristic",
  "Nature-Inspired",
  "Industrial",
];

const activities = [
  "Fashion Shoot",
  "Product Photography",
  "Podcast Recording",
  "Music Video Shoot",
  "Interview Setup",
  "E-commerce Shoot",
  "Dance Recording",
];

type FilterPillProps = {
  label: string;
  selected: boolean;
  toggle: (label: string) => void;
};

const FilterPill = ({ label, selected, toggle }: FilterPillProps) => (
  <button
    onClick={() => toggle(label)}
    className={`px-3 py-1 text-sm border rounded-full ${
      selected ? "bg-black text-white" : "bg-gray-100 text-gray-700"
    }`}
  >
    {label}
  </button>
);

type AdvancedFiltersProps = {
  onClose?: () => void;
};

export default function AdvancedFilters({ onClose }: AdvancedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAesthetic = searchParams?.getAll("aesthetic") || [];
  const initialActivity = searchParams?.getAll("activity") || [];

  const [selectedAesthetic, setSelectedAesthetic] = useState<string[]>(initialAesthetic);
  const [selectedActivity, setSelectedActivity] = useState<string[]>(initialActivity);

  const toggleFilter = (label: string, group: "aesthetic" | "activity") => {
    const current = group === "aesthetic" ? selectedAesthetic : selectedActivity;
    const set = group === "aesthetic" ? setSelectedAesthetic : setSelectedActivity;

    if (current.includes(label)) {
      set(current.filter((i) => i !== label));
    } else {
      set([...current, label]);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams();

    selectedAesthetic.forEach((a) => params.append("aesthetic", a));
    selectedActivity.forEach((a) => params.append("activity", a));

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedAesthetic, selectedActivity]);

  return (
    <div className="bg-white border-t z-10 relative top-[120px] px-6 py-4 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Advanced Filters</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ✕ Close
          </button>
        )}
      </div>

      <div className="mb-2 text-sm font-semibold">Aesthetic & Look</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {aesthetics.map((label) => (
          <FilterPill
            key={label}
            label={label}
            selected={selectedAesthetic.includes(label)}
            toggle={(label: string) => toggleFilter(label, "aesthetic")}
          />
        ))}
      </div>

      <div className="mb-2 text-sm font-semibold">Activity</div>
      <div className="flex flex-wrap gap-2">
        {activities.map((label) => (
          <FilterPill
            key={label}
            label={label}
            selected={selectedActivity.includes(label)}
            toggle={(label: string) => toggleFilter(label, "activity")}
          />
        ))}
      </div>
    </div>
  );
}
