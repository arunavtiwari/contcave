"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteListingAction, updateListingAction } from "@/app/actions/listingActions";
import ListingCard from "@/components/listing/ListingCard";
import Modal from "@/components/modals/Modal";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function PropertiesClient({ listings, currentUser }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const onEdit = useCallback(
    (_id: string) => {
      startTransition(async () => {
        const res = await updateListingAction(_id, {}); // Basic update triggers revalidation
        if (res.success) {
          toast.success("Listing updated");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update listing");
        }
      });
    },
    [router]
  );

  const onDelete = useCallback((id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedId) return;

    setDeletingId(selectedId);
    setIsModalOpen(false);

    startTransition(async () => {
      const res = await deleteListingAction(selectedId);
      if (res.success) {
        toast.success("Listing deleted");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete listing");
      }
      setDeletingId("");
      setSelectedId("");
    });
  }, [selectedId, router]);

  const onChat = useCallback(
    (id: string) => {
      router.push(`/dashboard/chat/${id}`)
    },
    [router]
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            data={listing}
            actionId={listing.id}
            onDelete={onDelete}
            onEdit={onEdit}
            onChat={onChat}
            disabled={deletingId === listing.id}
            actionLabel="Delete property"
            currentUser={currentUser}
            allowScale={false}
          />
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleConfirmDelete}
        title="Delete Property"
        actionLabel="Delete"
        secondaryAction={() => setIsModalOpen(false)}
        secondaryActionLabel="Cancel"
        disabled={isPending}
        body={
          <div className="p-4">
            <p className="text-center text-neutral-600">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
          </div>
        }
      />
    </>
  );
}

export default PropertiesClient;
