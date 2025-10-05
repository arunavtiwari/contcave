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
    <div
      onClick={() => onClick(label)}
      className={` rounded-xl border-2 p-4 flex flex-col items-center hover:border-black transition cursor-pointer ${selected ? "text-white bg-black" : "text-black bg-white"}`}
    >
      <Icon size={30} />
      <div className="font-semibold">{label}</div>
    </div>
  );
}

export default CategoryInput;
