"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function PropertiesClient({ listings, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");

  const onEdit = useCallback(
    (id: string) => {
      setEditingId(id);

      axios
        .patch(`/api/listings/${id}`)
        .then(() => {
          toast.info("Listing deleted", {
            toastId: "Listing_Deleted"
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Listing_Error_1"
          });
        })
        .finally(() => {
          setEditingId("");
        });
    },
    [router]
  );
  const onDelete = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/listings/${id}`)
        .then(() => {
          toast.info("Listing deleted", {
            toastId: "Listing_Deleted"
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Listing_Error_2"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );
  const onChat = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`)

    },
    [router]
  );
  return (
    <div className="mt-5">
      <Container>
        <Heading title="My Properties" subtitle="Efficiently Manage, Update, and Showcase Your Listings with Ease." />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {listings.map((listing: any) => (
            <ListingCard
              key={listing.id}
              data={listing}
              actionId={listing.id}
              onAction={onDelete}
              onDelete={onDelete}
              onEdit={onEdit}
              onChat={onChat}
              disabled={deletingId === listing.id}
              actionLabel="Delete property"
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

export default PropertiesClient;
