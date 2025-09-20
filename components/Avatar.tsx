"use client";

import Image from "next/image";
import React from "react";

type Props = {
  src?: string | null;
  userName?: string | null;
  size?: number;
};

function Avatar({ src, userName, size = 30 }: Props) {
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
      ) : userName ? (
        <Image
          className="rounded-full"
          alt="nameImage"
          width={size}
          height={size}
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=${size}`}
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
