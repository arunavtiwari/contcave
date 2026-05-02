"use client";

import { useSearchParams } from "next/navigation";
import { memo, Suspense, useCallback, useMemo } from "react";
import { BiSearch } from "react-icons/bi";

import Button from "@/components/ui/Button";
import useCountries from "@/hooks/useCities";
import useUIStore from "@/hooks/useUIStore";
import { formatISTDate } from "@/lib/utils";

const SearchContent = memo(function SearchContent() {
  const uiStore = useUIStore();
  const params = useSearchParams();
  const { getByValue } = useCountries();

  const locationValue = params?.get("locationValue");
  const startDate = params?.get("selectedDate");

  const locationLabel = useMemo(() => {
    if (locationValue) {
      return getByValue(locationValue as string)?.label;
    }
    return "City";
  }, [getByValue, locationValue]);

  const dateLabel = useMemo(() => {
    if (startDate) {
      const formattedDate = formatISTDate(startDate as string, {
        month: "short",
        day: "numeric",
      });
      return <span className="text-sm">{formattedDate}</span>;
    }
    return "Date";
  }, [startDate]);

  const handleClick = useCallback(() => {
    uiStore.onOpen("search");
  }, [uiStore]);

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="md"
      rounded
      outline
      fit
      className="bg-background/20 backdrop-blur-md px-2!"
    >
      <div className="flex flex-row items-center justify-between w-full">
        <div className="text-sm font-medium px-6">{locationLabel}</div>
        <div className="hidden sm:block text-sm font-medium px-6 border-s flex-1 text-center">
          {dateLabel}
        </div>
        <div className="text-muted-foreground flex flex-row items-center gap-3">
          <div className="p-2 bg-foreground rounded-full text-background">
            <BiSearch size={16} />
          </div>
        </div>
      </div>
    </Button>
  );
});

SearchContent.displayName = "SearchContent";

const Search = memo(function Search() {
  return (
    <Suspense fallback={
      <Button
        variant="ghost"
        rounded
        outline
        fit
        className="p-2! bg-background/20 backdrop-blur-md opacity-50"
        disabled
      >
        <div className="flex flex-row items-center justify-between w-full">
          <div className="text-sm font-medium px-6">City</div>
          <div className="hidden sm:block text-sm font-medium px-6 border-s flex-1 text-center">
            Date
          </div>
          <div className="text-muted-foreground flex flex-row items-center gap-3">
            <div className="p-2 bg-foreground rounded-full text-background">
              <BiSearch size={16} />
            </div>
          </div>
        </div>
      </Button>
    }>
      <SearchContent />
    </Suspense>
  );
});

Search.displayName = "Search";

export default Search;

