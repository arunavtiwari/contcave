"use client";

import { useState } from "react";
import { FiShare } from "react-icons/fi";

import HeartButton from "@/components/listing/HeartButton";
import ShareModal from "@/components/modals/ShareModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import useCities from "@/hooks/useCities";
import { usePublicSiteUrl } from "@/hooks/usePublicSiteUrl";
import { cityWithState } from "@/lib/listing/cityPaths";
import type { SafeUser } from "@/types/user";

type Props = {
  id: string;
  title: string;
  locationValue: string;
  path: string;
  image?: string;
  currentUser?: SafeUser | null;
};

export default function ListingTitle({ id, title, locationValue, path, image, currentUser }: Props) {
  const [sharing, setSharing] = useState(false);
  const siteUrl = usePublicSiteUrl();
  const cityData = useCities().getByValue(locationValue);
  const location = cityData ? cityWithState(cityData.name, cityData.state) : locationValue;

  return (
    <div className="flex items-start justify-between gap-4">
      <Heading variant="h5" as="h1" title={title} subtitle={location} />
      <div className="flex shrink-0 items-center gap-1">
        <Button label="Share" icon={FiShare} variant="ghost" fit onClick={() => setSharing(true)} />
        <HeartButton listingId={id} currentUser={currentUser} />
      </div>
      <ShareModal
        isOpen={sharing}
        onClose={() => setSharing(false)}
        url={siteUrl(path)}
        title={title}
        location={location}
        image={image}
      />
    </div>
  );
}
