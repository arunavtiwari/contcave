import Link from "next/link";
import { FiChevronRight, FiMapPin } from "react-icons/fi";

import Heading from "@/components/ui/Heading";
import { type CityEntry, cityPath } from "@/lib/listing/cities";
import { formatINR } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  cities: CityEntry[];
};

export default function CityLinks({ id, title, cities }: Props) {
  if (cities.length === 0) return null;

  return (
    <nav aria-labelledby={id} className="flex flex-col gap-4">
      <Heading id={id} title={title} as="h2" variant="h5" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cities.map((city) => (
          <li key={city.slug}>
            <Link
              href={cityPath(city.city)}
              className="group flex h-full items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-foreground sm:p-4"
            >
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:flex">
                <FiMapPin size={16} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold text-foreground">{city.city}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {city.count} {city.count === 1 ? "studio" : "studios"}
                  {city.fromPrice ? ` · from ${formatINR(city.fromPrice)}/hr` : ""}
                </span>
              </span>
              <FiChevronRight
                size={16}
                aria-hidden
                className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
