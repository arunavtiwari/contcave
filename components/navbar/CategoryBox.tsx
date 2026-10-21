"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { memo, type MouseEvent, Suspense, useMemo } from "react";
import { IconType } from "react-icons";

import Tooltip from "@/components/ui/Tooltip";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";

type Props = {
  icon: IconType;
  label: string;
  /** Value written to the `purpose` query param. */
  value: string;
  /** Small line under the label, e.g. "Cyc, white wall, green screen". */
  description?: string;
  selected?: boolean;
  city?: string;
  href?: string;
};

const CategoryBoxContent = memo(function CategoryBoxContent({ icon: Icon, label, value, description, selected, city, href }: Props) {
  const params = useSearchParams();
  const { navigate } = useFilterNavigation();

  const currentQuery = params ? qs.parse(params.toString()) : {};

  const updatedQuery: Record<string, string | string[] | null | undefined> = {
    ...(city ? { locationValue: city } : {}),
    ...currentQuery,
    purpose: value,
  };

  if (params?.get("purpose") === value) {
    delete updatedQuery.purpose;
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
      `flex flex-col items-center justify-center gap-1 px-3 py-2 border-b-2 hover:text-foreground transition cursor-pointer ${selected ? "border-b-foreground text-foreground" : "border-transparent text-muted-foreground"
      }`,
    [selected]
  );

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href ?? url);
  };

  return (
    <Tooltip content={description} side="bottom" delayDuration={0}>
      <Link href={href ?? url} className={className} onClick={handleClick} aria-pressed={selected}>
        <Icon size={20} />
        <div className="font-medium text-xs w-fit whitespace-nowrap">{label}</div>
      </Link>
    </Tooltip>
  );
});

CategoryBoxContent.displayName = "CategoryBoxContent";

const CategoryBox = memo(function CategoryBox(props: Props) {
  return (
    <Suspense fallback={
      <div className={`flex flex-col items-center justify-center gap-1 px-3 py-2 border-b-2 border-transparent text-muted-foreground`}>
        <props.icon size={20} />
        <div className="font-medium text-xs w-fit whitespace-nowrap">{props.label}</div>
      </div>
    }>
      <CategoryBoxContent {...props} />
    </Suspense>
  );
});

CategoryBox.displayName = "CategoryBox";

export default CategoryBox;
