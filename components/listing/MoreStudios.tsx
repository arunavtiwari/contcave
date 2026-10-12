import Container from "@/components/layout/Container";
import ListingCard, { type ListingCardData } from "@/components/listing/ListingCard";
import TextLink from "@/components/ui/TextLink";
import type { SafeUser } from "@/types/user";

type Props = {
  heading: string;
  listings: ListingCardData[];
  currentUser?: SafeUser | null;
  moreHref?: string;
  moreLabel?: string;
};

export default function MoreStudios({ heading, listings, currentUser, moreHref, moreLabel }: Props) {
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby="more-studios-heading" className="pb-24">
      <Container>
        <div className="w-full">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 id="more-studios-heading" className="text-xl font-semibold text-foreground">
              {heading}
            </h2>
            {moreHref && moreLabel && (
              <TextLink href={moreHref} className="text-sm">
                {moreLabel}
              </TextLink>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {listings.map((listing) => (
              <ListingCard key={listing.id} data={listing} currentUser={currentUser} showListingBadge />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
