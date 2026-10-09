"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { memo, type MouseEvent, Suspense, useMemo } from "react";
import { IconType } from "react-icons";

import { useFilterNavigation } from "@/hooks/useFilterNavigation";

type Props = {
  icon: IconType;
  label: string;
  selected?: boolean;
  city?: string;
  href?: string;
};

const CategoryBoxContent = memo(function CategoryBoxContent({ icon: Icon, label, selected, city, href }: Props) {
  const params = useSearchParams();
  const { navigate } = useFilterNavigation();

  const currentQuery = params ? qs.parse(params.toString()) : {};

  const updatedQuery: Record<string, string | string[] | null | undefined> = {
    ...(city ? { locationValue: city } : {}),
    ...currentQuery,
    venueTypes: label,
  };

  if (params?.get("venueTypes") === label) {
    delete updatedQuery.venueTypes;
  }

  const url = qs.stringifyUrl(
    {
      url: "/studios",
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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href ?? url);
  };

  return (
    <Link href={href ?? url} className={className} onClick={handleClick}>
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
