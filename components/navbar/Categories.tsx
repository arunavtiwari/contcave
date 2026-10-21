"use client";

import { useSearchParams } from "next/navigation";
import { memo, Suspense, useMemo } from "react";
import { FiSliders } from "react-icons/fi";

import FilterModal from "@/components/modals/FilterModal";
import CategoryBox from "@/components/navbar/CategoryBox";
import Button from "@/components/ui/Button";

import { purposeCategories } from "./purposeCategories";


type Props = {
  city?: string;
};

const CategoriesContent = memo(function CategoriesContent({ city }: Props) {
  const params = useSearchParams();
  const purpose = useMemo(() => params?.get("purpose"), [params]);

  const categoryItems = useMemo(
    () =>
      purposeCategories.map((item) => (
        <CategoryBox
          key={item.slug}
          icon={item.icon}
          label={item.label}
          value={item.slug}
          description={item.description}
          selected={purpose === item.slug}
          city={city}
        />
      )),
    [purpose, city]
  );

  return (
    <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-border">
      <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
        {categoryItems}
      </div>
      <FilterModal city={city} />
    </div>
  );
});

CategoriesContent.displayName = "CategoriesContent";

const Categories = memo(function Categories(props: Props) {
  return (
    <Suspense fallback={
      <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-border">
        <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
          {purposeCategories.map((item) => (
            <div key={item.slug} className="flex flex-col items-center justify-center gap-1 px-3 py-2 border-b-2 border-transparent text-muted-foreground">
              <item.icon size={20} />
              <div className="font-medium text-xs w-fit whitespace-nowrap">{item.label}</div>
            </div>
          ))}
        </div>
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
      </div>
    }>
      <CategoriesContent {...props} />
    </Suspense>
  );
});

Categories.displayName = "Categories";

export default Categories;
