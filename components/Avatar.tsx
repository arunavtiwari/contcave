"use client";

import Image from "next/image";
import React from "react";

type Props = {
  src?: string | null;
  size?: number;
};

function Avatar({ src, size = 30 }: Props) {
  return (
    <div>
      {src ? (
        <Image
          className="rounded-full"
          height={size}
          width={size}
          alt="hasImage"
          src={src}
        />
      ) : (
        <Image
          className="rounded-full"
          height={size}
          width={size}
          alt="noUser"
          src="/assets/avatar.png"
        />
      )}
    </div>
  );
}

export default Avatar;
