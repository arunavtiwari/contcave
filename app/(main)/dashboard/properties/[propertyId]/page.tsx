
import getAddons from '@/app/actions/getAddons';
import getAmenities from '@/app/actions/getAmenities';
import getCurrentUser from '@/app/actions/getCurrentUser';
import getListingById from '@/app/actions/getListingById';
import EmptyState from '@/components/EmptyState';
import PropertyClient from '@/components/PropertyClient';
export const dynamic = "force-dynamic"

interface IParams {
  propertyId?: string;
}
const EditPropertyComponent = async (props: { params: Promise<IParams> }) => {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  const listing = await getListingById({ listingId: params.propertyId });
  const amenitiesData = await getAmenities();
  const addonsData = await getAddons();

  if (!listing) {
    return <EmptyState />;
  }
  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }
  return (
    <PropertyClient listing={listing} predefinedAmenities={amenitiesData} predefinedAddons={addonsData}></PropertyClient>
  );
};

export default EditPropertyComponent;
