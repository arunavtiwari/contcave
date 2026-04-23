"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

const Logo = memo(function Logo() {
  return (
    <Link href="/">
      <div className="w-full max-w-50">
        <Image
          alt="logo-large"
          height={40}
          width={160}
          src="/assets/logo.png"
          className="hidden sm:block cursor-pointer h-8 w-auto"
          priority
        />
        <Image
          alt="logo-small"
          height={32}
          width={32}
          src="/assets/logo_small.png"
          className="block sm:hidden cursor-pointer h-8 w-auto"
          priority
        />
      </div>
    </Link>
  );
});

Logo.displayName = "Logo";

export default Logo;
