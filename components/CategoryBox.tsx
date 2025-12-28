"use client";

import { memo, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { IconType } from "react-icons";

type Props = {
  icon: IconType;
  label: string;
  selected?: boolean;
};

const CategoryBoxContent = memo(function CategoryBoxContent({ icon: Icon, label, selected }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const handleClick = useCallback(() => {
    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const updatedQuery: Record<string, string | string[] | null | undefined> = {
      ...currentQuery,
      category: label,
    };

    if (params?.get("category") === label) {
      delete updatedQuery.category;
    }

    const url = qs.stringifyUrl(
      {
        url: "/home",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    router.push(url);
  }, [label, params, router]);

  const className = useMemo(
    () =>
      `flex flex-col items-center justify-center gap-2 p-3 border-b-2 hover:text-neutral-800 transition cursor-pointer ${selected ? "border-b-neutral-800 text-neutral-800" : "border-transparent text-neutral-500"
      }`,
    [selected]
  );

  return (
    <div onClick={handleClick} className={className}>
      <Icon size={26} />
      <div className="font-medium text-xs w-fit whitespace-nowrap">{label}</div>
    </div>
  );
});

CategoryBoxContent.displayName = "CategoryBoxContent";

const CategoryBox = memo(function CategoryBox(props: Props) {
  return (
    <Suspense fallback={
      <div className={`flex flex-col items-center justify-center gap-2 p-3 border-b-2 border-transparent text-neutral-500`}>
        <props.icon size={26} />
        <div className="font-medium text-xs w-fit whitespace-nowrap">{props.label}</div>
      </div>
    }>
      <CategoryBoxContent {...props} />
    </Suspense>
  );
});

CategoryBox.displayName = "CategoryBox";

export default CategoryBox;
