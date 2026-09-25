import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import Container from "@/components/layout/Container";
import ListingFeed from "@/components/listing/ListingFeed";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Heading from "@/components/ui/Heading";
import { LocationSortProvider } from "@/hooks/useLocationSort";
import { cityPath, describeCity, findCity, getCityDirectory } from "@/lib/listing/cities";
import { listingPath, listingSummaryJsonLd } from "@/lib/listing/seo";
import { absoluteUrl, BRAND_NAME, breadcrumbJsonLd, OG_IMAGE } from "@/lib/seo";
import type { safeListing } from "@/types/listing";

type RouteParams = { city: string };

const trailFor = (city: string) => [
  { name: "Home", href: "/" },
  { name: "Studios", href: "/studios" },
  { name: city },
];

const loadCity = cache(async (slug: string) => {
  const entry = await findCity(slug);
  if (!entry) return null;
  const listings = await getListings({ locationValue: entry.city });
  return listings.length ? { entry, listings, ...describeCity(entry, listings) } : null;
});

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { city: slug } = await params;
  const page = await loadCity(slug);
  if (!page) {
    return { title: "Studios", robots: { index: false, follow: true } };
  }

  const { entry, description } = page;
  const title = `Studios for Rent in ${entry.city}`;
  const path = cityPath(entry.city);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: BRAND_NAME,
      locale: "en_IN",
      images: [{ url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@ContCave",
      creator: "@ContCave",
      images: [absoluteUrl(OG_IMAGE)],
    },
  };
}

export default async function CityStudiosPage(props: { params: Promise<RouteParams> }) {
  const { city: slug } = await props.params;
  const [page, currentUser, directory] = await Promise.all([
    loadCity(slug),
    getCurrentUser(),
    getCityDirectory(),
  ]);
  if (!page) notFound();

  const { entry, listings, intro } = page;
  const url = absoluteUrl(cityPath(entry.city));
  const trail = trailFor(entry.city);
  const otherCities = directory.filter((other) => other.slug !== entry.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: `Studios for rent in ${entry.city}`,
        description: intro,
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        about: { "@type": "City", name: entry.city, containedInPlace: { "@type": "Country", name: "India" } },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: listings.length,
          itemListElement: listings.map((listing, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(listingPath(listing)),
            item: listingSummaryJsonLd(listing),
          })),
        },
      },
      breadcrumbJsonLd(trail, url),
    ],
  };

  return (
    <main>
      <JsonLd id={`city-jsonld-${entry.slug}`} data={jsonLd} />
      <Container>
        <div className="flex flex-col gap-10 pt-8 pb-24">
          <header className="flex flex-col gap-4">
            <Breadcrumbs items={trail} />
            <Heading title={`Studios for rent in ${entry.city}`} as="h1" variant="h3" />
            <p className="max-w-3xl text-muted-foreground">{intro}</p>
          </header>

          <LocationSortProvider>
            <ListingFeed listings={listings as unknown as safeListing[]} currentUser={currentUser} />
          </LocationSortProvider>


          {otherCities.length > 0 && (
            <nav aria-labelledby="other-cities" className="flex flex-col gap-3">
              <Heading id="other-cities" title="Studios in other cities" as="h2" variant="h5" />
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {otherCities.map((other) => (
                  <li key={other.slug}>
                    <Link href={cityPath(other.city)} className="text-muted-foreground hover:text-foreground hover:underline">
                      {other.city} ({other.count})
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </Container>
    </main>
  );
}
