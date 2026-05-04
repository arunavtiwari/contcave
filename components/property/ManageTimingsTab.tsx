"use client";

import React from "react";

import ManageTimings from "@/components/ManageTimings";
import Heading from "@/components/ui/Heading";

interface ManageTimingsTabProps {
  listingId: string;
  operationalHours: { start?: string; end?: string };
  operationalDays: { start?: string; end?: string };
}

const ManageTimingsTab: React.FC<ManageTimingsTabProps> = ({
  listingId,
  operationalHours,
  operationalDays,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <Heading title="Manage Studio Availability" subtitle="Update your working hours manually" />
      <ManageTimings
        listingId={listingId}
        defaultStartTime={operationalHours?.start ?? ""}
        defaultEndTime={operationalHours?.end ?? ""}
        defaultStartDay={operationalDays?.start ?? ""}
        defaultEndDay={operationalDays?.end ?? ""}
      />
    </div>
  );
};

export default ManageTimingsTab;
