import Image from "next/image";

import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { FEED_ANCHOR } from "@/lib/listing/feedPages";
import type { PlacePage } from "@/lib/listing/placePage";
import { kindOf } from "@/lib/listing/seo";
import { FAQ_ANCHOR } from "@/lib/seo";
import { cn } from "@/lib/utils";

const COLLAGES = [
  ["col-span-6 row-span-2"],
  ["col-span-4 row-span-2", "col-span-2 row-span-2"],
  ["col-span-4 row-span-2", "col-span-2", "col-span-2"],
];

type Props = {
  page: PlacePage;
  pageLabel?: string;
  showFaq: boolean;
};

export default function PlaceHero({ page, pageLabel, showFaq }: Props) {
  const { copy, facts, heroStudios } = page;
  const tiles = COLLAGES[heroStudios.length - 1] ?? [];

  return (
    <section className="grid items-center gap-10 pt-8 pb-6 lg:grid-cols-2 lg:gap-14 lg:pt-12">
      <div>
        <SectionHeader
          as="h1"
          badge={pageLabel ? `${copy.badge} · ${pageLabel}` : copy.badge}
          title={<>{copy.heading.lead} <span className="text-muted-foreground italic">{copy.heading.place}</span></>}
          description={copy.intro}
          className="mb-0"
        />

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse border-l border-border pl-4">
              <dt className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{fact.label}</dt>
              <dd className="font-serif text-2xl font-semibold text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button label={copy.browse} href={`#${FEED_ANCHOR}`} rounded fit size="lg" />
          {showFaq && <Button label="Read the FAQ" href={`#${FAQ_ANCHOR}`} variant="outline" rounded fit size="lg" />}
        </div>
      </div>

      {tiles.length > 0 && (
        <div className="hidden h-110 grid-cols-6 grid-rows-2 gap-3 lg:grid">
          {heroStudios.map((studio, index) => (
            <div key={studio.id} className={cn("relative overflow-hidden rounded-3xl bg-muted", tiles[index])}>
              <Image
                src={studio.imageSrc[0]}
                alt={`${studio.title}, ${kindOf(studio)} in ${studio.locationValue}`}
                fill
                sizes="(min-width: 1024px) 30vw, 1px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
