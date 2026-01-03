"use client";

import Link from "next/link";
import { memo } from "react";
import { IconType } from "react-icons";

type Props = {
  onClick?: () => void;
  label: string;
  icon?: IconType;
  href?: string;
};

const MenuItem = memo(function MenuItem({ onClick, label, icon: Icon, href }: Props) {
  const content = (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 transition font-semibold rounded-xl cursor-pointer"
      onClick={href ? undefined : onClick}
    >
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return content;
});

MenuItem.displayName = "MenuItem";

export default MenuItem;
