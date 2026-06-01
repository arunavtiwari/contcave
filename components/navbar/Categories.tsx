"use client";

import { useSearchParams } from "next/navigation";
import { memo, Suspense, useMemo } from "react";

import CategoryBox from "@/components/CategoryBox";
import FilterModal from "@/components/modals/FilterModal";
import Button from "@/components/ui/Button";

import { categories } from "./categoriesData";


const CategoriesContent = memo(function CategoriesContent() {
  const params = useSearchParams();
  const category = useMemo(() => params?.get("category"), [params]);

  const categoryItems = useMemo(
    () =>
      categories.map((item) => (
        <CategoryBox
          key={item.label}
          icon={item.icon}
          label={item.label}
          selected={category === item.label}
        />
      )),
    [category]
  );

  return (
    <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-border">
      <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
        {categoryItems}
      </div>
      <FilterModal />
    </div>
  );
});

CategoriesContent.displayName = "CategoriesContent";

const Categories = memo(function Categories() {
  return (
    <Suspense fallback={
      <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-border">
        <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
          {categories.map((item) => (
            <div key={item.label} className="flex flex-col items-center justify-center gap-2 p-3 border-b-2 border-transparent text-muted-foreground">
              <item.icon size={26} />
              <div className="font-medium text-xs w-fit whitespace-nowrap">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <Button
            label="More Filters"
            variant="ghost"
            size="sm"
            fit
            className="bg-muted border border-border opacity-50"
            disabled
          />
        </div>
      </div>
    }>
      <CategoriesContent />
    </Suspense>
  );
});

Categories.displayName = "Categories";

export default Categories;
