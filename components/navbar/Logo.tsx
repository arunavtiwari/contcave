"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

const Logo = memo(function Logo() {
  return (
    <Link href="/">
      <div className="logo-container">
        <Image
          alt="logo-large"
          height={100}
          width={200}
          src="/assets/logo.png"
          className="hidden sm:block cursor-pointer"
          priority
          style={{ width: 'auto', height: 'auto' }}
        />
        <Image
          alt="logo-small"
          height={50}
          width={50}
          src="/assets/logo_small.png"
          className="block sm:hidden cursor-pointer"
          priority
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    </Link>
  );
});

Logo.displayName = "Logo";

export default Logo;
