"use client";

import Image from "next/image";

import useFavorite from "@/hooks/useFavorite";
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
      className="relative hover:opacity-90 transition cursor-pointer flex items-center justify-center p-1 bg-foreground/20 backdrop-blur-md rounded-full"
    >
      <Image
        src={hasFavorite ? "/images/icons/heart-red.png" : "/images/icons/heart-white.png"}
        alt="Heart Icon"
        width={22}
        height={22}
        style={{ width: "auto", height: "auto" }}
        className="object-contain transition contrast-150"
      />
    </div>
  );
}

export default HeartButton;
