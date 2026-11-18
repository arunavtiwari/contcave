"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { memo } from "react";
import { IconType } from "react-icons";

type Props = {
  label: string;
  icon?: IconType;
  /** Navigates; the menu closes on its own. */
  href?: string;
  /** Runs an action; the menu closes on its own. */
  onSelect?: () => void;
};

const ITEM_CLASS =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left font-medium outline-none transition data-highlighted:bg-muted";

/** One row of a navbar dropdown: arrow keys, Enter and type-ahead come from Radix. */
const MenuItem = memo(function MenuItem({ label, icon: Icon, href, onSelect }: Props) {
  const content = (
    <>
      {Icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <span className="leading-5">{label}</span>
    </>
  );

  return (
    <DropdownMenu.Item asChild onSelect={onSelect} className={ITEM_CLASS}>
      {href ? <Link href={href}>{content}</Link> : <button type="button">{content}</button>}
    </DropdownMenu.Item>
  );
});

export default MenuItem;
