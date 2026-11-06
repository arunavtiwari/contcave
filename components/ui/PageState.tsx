import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import Heading from "@/components/ui/Heading";
import { BRAND_NAME } from "@/lib/seo";

type PageStateProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions: ReactNode;
  children?: ReactNode;
};

export default function PageState({ eyebrow, title, subtitle, actions, children }: PageStateProps) {
  return (
    <section className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <Link href="/" aria-label={`${BRAND_NAME} home`}>
          <Image
            src="/images/logo/logo_small.png"
            alt={`${BRAND_NAME} logo`}
            width={72}
            height={70}
            className="rounded-full"
            priority
          />
        </Link>
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <Heading as="h1" variant="h3" center title={title} subtitle={subtitle} subtitleClassName="mx-auto mt-2 max-w-md" />
      </div>
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
      {children}
    </section>
  );
}
