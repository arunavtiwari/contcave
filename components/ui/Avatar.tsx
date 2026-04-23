"use client";

import Image from "next/image";
import React from "react";
import { FaUserCircle } from "react-icons/fa";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  size?: number;
}

function Avatar({ src, size = 30, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn("relative overflow-hidden shrink-0 rounded-full bg-muted flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {src ? (
        <Image
          className="rounded-full object-cover"
          height={size}
          width={size}
          alt="Avatar"
          src={src}
          priority={false}
        />
      ) : (
        <FaUserCircle
          className="text-muted-foreground/40"
          size={size * 0.8}
        />
      )}
    </div>
  );
}

export default Avatar;
