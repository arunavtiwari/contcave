import type { Metadata } from "next";
import Link from "next/link";

import Button from "@/components/ui/Button";
import PageState from "@/components/ui/PageState";
import { getCityDirectory } from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";
import { BRAND_NAME } from "@/lib/seo";

const SUBTITLE = "The page you're looking for may have moved or no longer exists.";
const CITY_LINK_LIMIT = 8;

export const NOT_FOUND_METADATA: Metadata = {
  title: { absolute: `Page Not Found | ${BRAND_NAME}` },
  description: SUBTITLE,
  robots: { index: false, follow: true },
};

async function loadCities() {
  try {
    return (await getCityDirectory()).slice(0, CITY_LINK_LIMIT);
  } catch {
    return [];
  }
}

export default async function NotFoundState() {
  const cities = await loadCities();

  return (
    <PageState
      eyebrow="Error 404"
      title="We couldn't find that page"
      subtitle={SUBTITLE}
      actions={
        <>
          <Button label="Go to homepage" href="/" size="md" rounded fit />
          <Button label="Browse all studios" href="/studios" variant="outline" size="md" rounded fit />
        </>
      }
    >
      {cities.length > 0 && (
        <nav aria-label="Studios by city" className="flex max-w-2xl flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Studios by city</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={cityPath(city.city)}
                  className="block rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground"
                >
                  {city.city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </PageState>
  );
}
