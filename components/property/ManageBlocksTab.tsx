"use client";

import React from "react";

import BlocksManager from "@/components/BlocksManager";
import Heading from "@/components/ui/Heading";
import { ListingSet } from "@/types/set";

interface ManageBlocksTabProps {
  listingId: string;
  sets: ListingSet[];
}

const ManageBlocksTab: React.FC<ManageBlocksTabProps> = ({
  listingId,
  sets,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <Heading
        title="Manage Availability Blocks"
        subtitle="Block specific sets or the entire listing for maintenance or personal use"
      />
      <BlocksManager
        listingId={listingId}
        sets={sets ?? []}
      />
    </div>
  );
};

export default ManageBlocksTab;
