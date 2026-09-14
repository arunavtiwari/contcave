"use client";

import React from "react";
import { FiAlertCircle } from "react-icons/fi";

import CategoryInput from "@/components/inputs/CategoryInput";
import { categories } from "@/components/navbar/categoriesData";
import Heading from "@/components/ui/Heading";

interface CategoryStepProps {
  venueTypes: string[];
  setCustomValue: (id: string, value: unknown) => void;
  categoryError: string;
  setCategoryError: (error: string) => void;
}

const CategoryStep: React.FC<CategoryStepProps> = ({
  venueTypes,
  setCustomValue,
  categoryError,
  setCategoryError,
}) => {
  const toggle = (label: string) => {
    const next = venueTypes.includes(label)
      ? venueTypes.filter((v) => v !== label)
      : [...venueTypes, label];
    setCustomValue("venueTypes", next);
    // keep category in sync with first selection for back-compat
    setCustomValue("category", next[0] ?? "");
    setCategoryError("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Heading title="Choose your space type" subtitle="Select all that apply" variant="h5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((item) => (
          <CategoryInput
            key={item.label}
            onClick={toggle}
            selected={venueTypes.includes(item.label)}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </div>
      {categoryError && (
        <div role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-in fade-in-50 slide-in-from-top-0.5">
          <FiAlertCircle className="size-3.5 shrink-0 stroke-[2.25]" />
          <span>{categoryError}</span>
        </div>
      )}
    </div>
  );
};

export default CategoryStep;
