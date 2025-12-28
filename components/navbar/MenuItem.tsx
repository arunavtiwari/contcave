"use client";


import { IconType } from "react-icons";

type Props = {
  onClick: () => void;
  label: string;
  icon?: IconType;
};

function MenuItem({ onClick, label, icon: Icon }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 transition font-semibold rounded-xl cursor-pointer"
      onClick={onClick}
    >
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </div>
  );
}

export default MenuItem;
