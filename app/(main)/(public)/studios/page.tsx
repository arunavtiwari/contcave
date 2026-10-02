import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/layout/Container";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Heading from "@/components/ui/Heading";
import { cityPath, getCityDirectory } from "@/lib/listing/cities";
import { absoluteUrl, BRAND_NAME, breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";

const INR = new Intl.NumberFormat("en-IN");
const TITLE = "Studios for Rent Across India";
const DESCRIPTION =
  "Browse verified photo, video, podcast and event studios by city and book them by the hour on ContCave.";
const TRAIL = [{ name: "Home", href: "/" }, { name: "Studios" }];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/studios" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/studios"),
    siteName: BRAND_NAME,
    locale: "en_IN",
    images: [{ url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [absoluteUrl(OG_IMAGE)],
  },
};

export default async function StudiosByCityPage() {
  const cities = await getCityDirectory();
  const total = cities.reduce((sum, city) => sum + city.count, 0);
  const url = absoluteUrl("/studios");
  const intro = cities.length
    ? `${total} verified ${total === 1 ? "studio" : "studios"} in ${cities.length} ${cities.length === 1 ? "city" : "cities"}, each bookable by the hour.`
    : "New studios are being verified. Check back soon.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: TITLE,
        description: intro,
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: cities.length,
          itemListElement: cities.map((city, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `Studios for rent in ${city.city}`,
            url: absoluteUrl(cityPath(city.city)),
          })),
        },
      },
      breadcrumbJsonLd(TRAIL, url),
    ],
  };

  return (
    <main>
      <JsonLd id="studios-jsonld" data={jsonLd} />
      <Container>
        <div className="flex flex-col gap-10 pt-8 pb-24">
          <header className="flex flex-col gap-4">
            <Breadcrumbs items={TRAIL} />
            <Heading title="Studios for rent across India" as="h1" variant="h3" />
            <p className="max-w-3xl text-muted-foreground">{intro}</p>
          </header>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={cityPath(city.city)}
                  className="flex h-full flex-col gap-1 rounded-2xl border border-border p-5 transition-colors hover:border-foreground"
                >
                  <span className="text-lg font-semibold text-foreground">{city.city}</span>
                  {city.state && city.state !== city.city && (
                    <span className="text-sm text-muted-foreground">{city.state}</span>
                  )}
                  <span className="mt-2 text-sm text-muted-foreground">
                    {city.count} {city.count === 1 ? "studio" : "studios"}
                    {city.fromPrice ? ` · from ₹${INR.format(city.fromPrice)}/hr` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </main>
  );
}
