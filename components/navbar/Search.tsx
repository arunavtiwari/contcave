"use client";

import { useSearchParams } from "next/navigation";
import { memo, Suspense,useCallback, useMemo } from "react";
import { BiSearch } from "react-icons/bi";

import useCountries from "@/hook/useCities";
import useSearchModal from "@/hook/useSearchModal";

const SearchContent = memo(function SearchContent() {
  const searchModel = useSearchModal();
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
      const start = new Date(startDate as string);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      const formattedDate = start.toLocaleString('en-US', options);
      return <span style={{ fontSize: '14px' }}>{formattedDate}</span>;
    }
    return "Date";
  }, [startDate]);

  const handleClick = useCallback(() => {
    searchModel.onOpen();
  }, [searchModel]);

  return (
    <div
      onClick={handleClick}
      className="border-2 md:w-auto p-2 rounded-full shadow-xs hover:shadow-sm transition cursor-pointer"
    >
      <div className="flex flex-row items-center justify-between">
        <div className="text-sm font-semibold px-6">{locationLabel}</div>
        <div className="hidden sm:block text-sm font-semibold px-6 border-s flex-1 text-center">
          {dateLabel}
        </div>
        <div className="text-sm text-gray-600 flex flex-row items-center gap-3">
          <div className="p-2 bg-black rounded-full text-white">
            <BiSearch size={16} />
          </div>
        </div>
      </div>
    </div>
  );
});

SearchContent.displayName = "SearchContent";

const Search = memo(function Search() {
  return (
    <Suspense fallback={
      <div className="border-2 md:w-auto p-2 rounded-full shadow-xs">
        <div className="flex flex-row items-center justify-between">
          <div className="text-sm font-semibold px-6">City</div>
          <div className="hidden sm:block text-sm font-semibold px-6 border-s flex-1 text-center">
            Date
          </div>
          <div className="text-sm text-gray-600 flex flex-row items-center gap-3">
            <div className="p-2 bg-black rounded-full text-white">
              <BiSearch size={16} />
            </div>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
});

Search.displayName = "Search";

export default Search;
