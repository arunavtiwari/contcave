import Container from "@/components/layout/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import TextLink from "@/components/ui/TextLink";
import { placeIndex, popularSearches } from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";

const POPULAR_SEARCHES = 8;

const LINK_GRID = "grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4";

/**
 * Links to every city and popular search page, one tab at a time. Both panels stay in the HTML so
 * search engines can follow all of them.
 */
export default async function ExploreStudios() {
  const { all: places, covered } = await placeIndex();
  const searches = popularSearches(covered, POPULAR_SEARCHES);

  return (
    <section aria-labelledby="explore-studios" className="border-t border-border bg-background">
      <Container>
        <div className="py-10">
          <h2 id="explore-studios" className="mb-4 text-xl font-semibold text-foreground">
            Explore studios
          </h2>
          <Tabs defaultValue="cities" className="w-full">
            <TabsList aria-label="Explore studios by">
              <TabsTrigger value="cities">Cities</TabsTrigger>
              <TabsTrigger value="searches">Popular searches</TabsTrigger>
            </TabsList>
            <TabsContent value="cities" keepMounted className={LINK_GRID}>
              <TextLink variant="muted" href="/studios">All studios</TextLink>
              {places.map((place) => (
                <TextLink key={place.slug} variant="muted" href={cityPath(place.city)}>
                  {place.city}
                </TextLink>
              ))}
            </TabsContent>
            <TabsContent value="searches" keepMounted className={LINK_GRID}>
              {searches.map((search) => (
                <TextLink key={search.href} variant="muted" href={search.href}>
                  {search.label}
                </TextLink>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </section>
  );
}
