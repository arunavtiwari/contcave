import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="ContCave Home" className="logo-container inline-flex items-center">
      {/* Desktop/Large */}
      <Image
        alt="ContCave"
        height={100}
        width={200}
        src="/assets/logo.png"
        className="hidden sm:block"
        priority
      />
      {/* Mobile/Small */}
      <Image
        alt="ContCave"
        height={50}
        width={50}
        src="/assets/logo_small.png"
        className="block sm:hidden"
        priority
      />
    </Link>
  );
}
