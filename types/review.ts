export type ReviewSource = "PLATFORM" | "WHATSAPP";

export type SafeReview = {
  id: string;
  userId: string | null;
  listingId: string;
  reservationId: string | null;
  source?: ReviewSource | null;
  rating: number | null;
  comment: string;
  guestName?: string | null;
  guestRole?: string | null;
  createdAt: string;
};

export type PublicReview = Pick<SafeReview, "id" | "listingId" | "rating" | "comment" | "createdAt"> & {
  source?: ReviewSource | null;
  guestName?: string | null;
  guestRole?: string | null;
  user: {
    name: string | null;
    image: string | null;
  } | null;
};

