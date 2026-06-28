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
  const isGoogleAvatar = src?.startsWith("https://lh3.googleusercontent.com/");
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const imageSrc = failedSrc === src ? null : src;

  return (
    <div
      className={cn("relative overflow-hidden shrink-0 rounded-full bg-muted flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {imageSrc ? (
        <Image
          className="object-cover"
          fill
          sizes={`${size}px`}
          alt="Avatar"
          src={imageSrc}
          priority={false}
          unoptimized={isGoogleAvatar}
          onError={() => setFailedSrc(imageSrc)}
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
