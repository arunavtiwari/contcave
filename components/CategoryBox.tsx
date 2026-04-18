"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { memo, Suspense, useMemo } from "react";
import { IconType } from "react-icons";

type Props = {
  icon: IconType;
  label: string;
  selected?: boolean;
};

const CategoryBoxContent = memo(function CategoryBoxContent({ icon: Icon, label, selected }: Props) {
  const params = useSearchParams();

  const currentQuery = params ? qs.parse(params.toString()) : {};

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

  const className = useMemo(
    () =>
      `flex flex-col items-center justify-center gap-2 p-3 border-b-2 hover:text-foreground transition cursor-pointer ${selected ? "border-b-foreground text-foreground" : "border-transparent text-muted-foreground"
      }`,
    [selected]
  );

  return (
    <Link href={url} className={className}>
      <Icon size={26} />
      <div className="font-medium text-xs w-fit whitespace-nowrap">{label}</div>
    </Link>
  );
});

CategoryBoxContent.displayName = "CategoryBoxContent";

const CategoryBox = memo(function CategoryBox(props: Props) {
  return (
    <Suspense fallback={
      <div className={`flex flex-col items-center justify-center gap-2 p-3 border-b-2 border-transparent text-muted-foreground`}>
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
