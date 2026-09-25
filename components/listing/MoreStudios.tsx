import Image from "next/image";
import Link from "next/link";

import Container from "@/components/layout/Container";

export type MoreStudiosItem = {
  id: string;
  title: string;
  href: string;
  image?: string;
  kind: string;
};

type Props = {
  heading: string;
  items: MoreStudiosItem[];
  moreHref?: string;
  moreLabel?: string;
};

export default function MoreStudios({ heading, items, moreHref, moreLabel }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="more-studios-heading" className="pb-24">
      <Container>
        <div className="max-w-280 mx-auto">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 id="more-studios-heading" className="text-xl font-semibold text-foreground">
              {heading}
            </h2>
            {moreHref && moreLabel && (
              <Link href={moreHref} className="text-sm font-semibold underline text-foreground">
                {moreLabel}
              </Link>
            )}
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="group block">
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={`${item.title} – ${item.kind}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
