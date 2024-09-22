"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {};

function Logo({ }: Props) {
  const router = useRouter();

  return (
    <div onClick={() => router.push("/")}>
      <div className="logo-container">
        <Image
          alt="logo-large"
          layout="responsive"
          height="100"
          width="200"
          src="/assets/logo.png"
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}

export default Logo;
