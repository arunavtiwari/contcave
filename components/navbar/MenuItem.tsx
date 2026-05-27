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
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition font-medium rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        {Icon && <Icon className="text-lg" />}
        <span>{label}</span>
      </Link>
    );
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition font-medium rounded-xl cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
    >
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </button>
  );
});

MenuItem.displayName = "MenuItem";

export default MenuItem;
