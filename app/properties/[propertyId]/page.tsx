
import getAddons from '@/app/actions/getAddons';
import getAmenities from '@/app/actions/getAmenities';
import getCurrentUser from '@/app/actions/getCurrentUser';
import getListingById from '@/app/actions/getListingById';
import ClientOnly from '@/components/ClientOnly';
import EmptyState from '@/components/EmptyState';
import PropertyClient from '@/components/PropertyClient';

import React from 'react';


interface IParams {
  propertyId?: string;
}
const EditPropertyComponent = async ({ params }: { params: IParams }) => {
  // Add any state management or handlers you may need for form submission or image uploads
  const currentUser = await getCurrentUser();
  const listing = await getListingById({ listingId: params.propertyId }) as any;
  const amenitiesData = await getAmenities();
  let addonsData = await getAddons();
  let updatedAddons:any = [];
  if (listing && listing.addons && listing.addons.length) {

    // Assuming addonsData is an array and listing.addons is an array or undefined
    updatedAddons = addonsData.map((item) => {
      let addon = listing.addons?.find((listitem:any) => listitem.name === item.name);
      if (addon) {
        // Update existing item
        return {
          ...item, // Spread existing properties
          price: addon.price, // Update price
          qty: addon.qty,
          checked: addon.checked ?? true
        };
      } else {
        // Return the item as is, since it doesn't need updating
        return item;
      }
    });

    // Now, add any new addons from listing.addons that aren't in addonsData
    listing.addons?.forEach((addon:any) => {
      let exists = addonsData.some((item) => item.name === addon.name);
      if (!exists) {
        updatedAddons.push({
          ...addon,
          checked: addon.checked ?? true// Since it's new, you might want to initialize 'checked' as false
        });
      }
    });

    // updatedAddons now contains your merged and updated list
    // You would proceed to use updatedAddons for your state update or any other logic.

  }
  console.log(updatedAddons);
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
    <ClientOnly>
      <PropertyClient listing={listing} predefinedAmenities={amenitiesData} predefinedAddons={updatedAddons}></PropertyClient>
    </ClientOnly>
  );
};

export default EditPropertyComponent;
