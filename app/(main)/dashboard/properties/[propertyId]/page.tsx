
import getAddons from '@/app/actions/getAddons';
import getAmenities from '@/app/actions/getAmenities';
import getCurrentUser from '@/app/actions/getCurrentUser';
import getListingById from '@/app/actions/getListingById';
import PropertyClient from '@/components/property/PropertyClient';
import EmptyState from "@/components/ui/EmptyState";
export const dynamic = "force-dynamic"

interface IParams {
  propertyId?: string;
}
const EditPropertyComponent = async (props: { params: Promise<IParams> }) => {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  const listing = await getListingById({ listingId: params.propertyId });

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }
  if (!listing || (listing.userId !== currentUser.id && currentUser.role !== "ADMIN")) {
    return <EmptyState />;
  }
  const [amenitiesData, addonsData] = await Promise.all([getAmenities(), getAddons()]);
  return (
    <PropertyClient listing={listing} predefinedAmenities={amenitiesData} predefinedAddons={addonsData}></PropertyClient>
  );
};

export default EditPropertyComponent;
