import ListingCard from "@/components/listing/ListingCard";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function FavoritesClient({ listings, currentUser }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing) => (
          <ListingCard
            currentUser={currentUser}
            key={listing.id}
            data={listing}
          />
        ))}
      </div>
    </>
  );
}

export default FavoritesClient;
