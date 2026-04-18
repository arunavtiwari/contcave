"use client";

import React from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";

import useFavorite from "@/hook/useFavorite";
import { SafeUser } from "@/types/user";

type Props = {
  listingId: string;
  currentUser?: SafeUser | null;
};

function HeartButton({ listingId, currentUser }: Props) {
  const { hasFavorite, toggleFavorite } = useFavorite({
    listingId,
    currentUser,
  });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(e);
      }}
      className=" relative hover:opacity-80 transition cursor-pointer"
    >
      <AiOutlineHeart
        size={28}
        className="fill-white absolute -top-0.5 -right-0.5"
      />
      <AiFillHeart
        size={24}
        className={hasFavorite ? "fill-rose-500" : "fill-muted-foreground/70"}
      />
    </div>
  );
}

export default HeartButton;
