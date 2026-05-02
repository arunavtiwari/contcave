"use client";

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
      className={`rounded-xl px-4 py-6 flex flex-col items-center transition cursor-pointer gap-2 focus:outline-none border border-neutral-200 ${selected ? "text-background bg-foreground" : "hover:bg-neutral-50"}`}
    >
      <Icon size={30} />
      <div className="font-medium text-center whitespace-nowrap text-sm">{label}</div>
    </button>
  );
}

export default CategoryInput;

