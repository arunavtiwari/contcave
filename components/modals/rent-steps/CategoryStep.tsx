"use client";

import React from "react";

import CategoryInput from "@/components/inputs/CategoryInput";
import { categories } from "@/components/navbar/Categories";
import Heading from "@/components/ui/Heading";

interface CategoryStepProps {
  category: string;
  setCustomValue: (id: string, value: unknown) => void;
  categoryError: string;
  setCategoryError: (error: string) => void;
}

const CategoryStep: React.FC<CategoryStepProps> = ({
  category,
  setCustomValue,
  categoryError,
  setCategoryError,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="Choose your space type" subtitle="Pick a category" variant="h5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((item) => (
          <CategoryInput
            key={item.label}
            onClick={(c) => {
              setCustomValue("category", c);
              setCategoryError("");
            }}
            selected={category === item.label}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </div>
      {categoryError && <p className="text-destructive text-sm">{categoryError}</p>}
    </div>
  );
};

export default CategoryStep;
