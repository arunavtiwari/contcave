import Container from "@/components/Container";
import ListingCard from "@/components/listing/ListingCard";
import Heading from "@/components/ui/Heading";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";
type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function FavoritesClient({ listings, currentUser }: Props) {
  return (
    <div className="mt-5">
      <Container>
        <Heading title="Favorites" subtitle="List of places you favorites!" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {listings.map((listing) => (
            <ListingCard
              currentUser={currentUser}
              key={listing.id}
              data={listing}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

export default FavoritesClient;
