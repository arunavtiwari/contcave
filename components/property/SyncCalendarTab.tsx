"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import React from "react";

import Calendar from "@/components/Calendar";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

interface SyncCalendarTabProps {
  isCalendarConnected: boolean;
  setIsCalendarConnected: (connected: boolean) => void;
  operationalDays: { start?: string; end?: string };
  listingId: string;
}

const SyncCalendarTab: React.FC<SyncCalendarTabProps> = ({
  isCalendarConnected,
  setIsCalendarConnected,
  operationalDays,
  listingId,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-8 items-center">
      <div className="flex justify-between w-full items-center">
        <Heading
          title="Connect Your Google Calendar"
          subtitle="Sync offline and ContCave bookings to keep your availability up to date—automatically"
        />
        {!isCalendarConnected && (
          <Button
            onClick={() => signIn("google-calendar")}
            fit
            className="px-15 h-fit py-2"
          >
            <div className="flex gap-4 items-center">
              <Image
                src="/images/icons/google_calendar.png"
                alt="Google Calendar"
                width={30}
                height={30}
                className="bg-background rounded-xl"
              />
              Sync Google Calendar
            </div>
          </Button>
        )}
      </div>

      <Calendar
        operationalStart={operationalDays?.start ?? ""}
        operationalEnd={operationalDays?.end ?? ""}
        listingId={listingId}
        googleCalendarConnected={isCalendarConnected}
        onError={() => setIsCalendarConnected(false)}
      />
    </div>
  );
};

export default SyncCalendarTab;
