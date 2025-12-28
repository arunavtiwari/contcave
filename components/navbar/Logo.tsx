"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = memo(function Logo() {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div onClick={handleClick}>
      <div className="logo-container">
        <Image
          alt="logo-large"
          height={100}
          width={200}
          src="/assets/logo.png"
          className="hidden sm:block cursor-pointer"
          priority
        />
        <Image
          alt="logo-small"
          height={50}
          width={50}
          src="/assets/logo_small.png"
          className="block sm:hidden cursor-pointer"
          priority
        />
      </div>
    </div>
  );
});

Logo.displayName = "Logo";

export default Logo;
