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
          height={100}
          width={200}
          src="/assets/logo.png"
          className="hidden sm:block cursor-pointer"
        />
        <Image
          alt="logo-small"
          height={50}
          width={50}
          src="/assets/logo_small.png"
          className="block sm:hidden cursor-pointer"
        />
      </div>
    </div>
  );
}

export default Logo;
