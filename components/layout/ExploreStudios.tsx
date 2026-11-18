import Link from "next/link";

import Container from "@/components/layout/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { placeIndex, popularSearches } from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";
import { pluralize } from "@/lib/strings";

const POPULAR_SEARCHES = 12;

const LINK_GRID = "grid w-full grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6";

function PlaceLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="border border-transparent group block min-w-0 rounded-lg py-1 outline-none focus-visible:border-foreground">
      <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4">{title}</span>
      <span className="block truncate text-sm text-muted-foreground">{detail}</span>
    </Link>
  );
}

/**
 * Links to every city and popular search page, one tab at a time. Both panels stay in the HTML so
 * search engines can follow all of them.
 */
export default async function ExploreStudios() {
  const { all: places, covered } = await placeIndex();
  const searches = popularSearches(covered, POPULAR_SEARCHES);
  const totalStudios = covered.reduce((sum, place) => sum + place.count, 0);

  return (
    <section aria-labelledby="explore-studios" className="border-t border-border bg-background">
      <Container>
        <div className="py-10">
          <h2 id="explore-studios" className="mb-5 text-xl font-semibold text-foreground">
            Explore studios
          </h2>
          <Tabs defaultValue="cities" className="w-full items-stretch">
            <TabsList aria-label="Explore studios by" className="w-fit">
              <TabsTrigger value="cities">Cities</TabsTrigger>
              <TabsTrigger value="searches">Popular searches</TabsTrigger>
            </TabsList>
            <TabsContent value="cities" keepMounted className={LINK_GRID}>
              <PlaceLink href="/studios" title="All studios" detail={`${pluralize(totalStudios, "studio")} across India`} />
              {places.map((place) => (
                <PlaceLink
                  key={place.slug}
                  href={cityPath(place.city)}
                  title={place.city}
                  detail={pluralize(place.count, "studio")}
                />
              ))}
            </TabsContent>
            <TabsContent value="searches" keepMounted className={LINK_GRID}>
              {searches.map((search) => (
                <PlaceLink key={search.href} href={search.href} title={search.category} detail={search.place} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </section>
  );
}
