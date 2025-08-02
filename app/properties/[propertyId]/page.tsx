
import getAddons from '@/app/actions/getAddons';
import getAmenities from '@/app/actions/getAmenities';
import getCurrentUser from '@/app/actions/getCurrentUser';
import getListingById from '@/app/actions/getListingById';
import ClientOnly from '@/components/ClientOnly';
import EmptyState from '@/components/EmptyState';
import PropertyClient from '@/components/PropertyClient';
export const dynamic = "force-dynamic"
import React from 'react';
import Container from '@/components/Container';

interface IParams {
  propertyId?: string;
}
const EditPropertyComponent = async (props: { params: Promise<IParams> }) => {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  const listing = await getListingById({ listingId: params.propertyId }) as any;
  const amenitiesData = await getAmenities(true);
  const addonsData = await getAddons();

  if (!listing) {
    return (
      <ClientOnly>
        <EmptyState />
      </ClientOnly>
    );
  }
  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }
  return (
    <Container>
      <ClientOnly>
        <PropertyClient listing={listing} predefinedAmenities={amenitiesData} predefinedAddons={addonsData}></PropertyClient>
      </ClientOnly>
    </Container>
  );
};

export default EditPropertyComponent;
