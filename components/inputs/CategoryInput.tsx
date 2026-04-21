"use client";

import React from "react";
import { IconType } from "react-icons";

type Props = {
  icon: IconType;
  label: string;
  selected?: boolean;
  onClick: (value: string) => void;
};

function CategoryInput({ icon: Icon, label, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className={`rounded-xl p-4 flex flex-col items-center transition cursor-pointer gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 ${selected ? "text-background bg-foreground" : "text-neutral-900 bg-neutral-100 hover:bg-neutral-200"}`}
    >
      <Icon size={30} />
      <div className="font-semibold text-center whitespace-nowrap text-sm">{label}</div>
    </button>
  );
}

export default CategoryInput;

