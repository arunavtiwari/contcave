export type SafeReview = {
  id: string;
  userId: string;
  listingId: string;
  reservationId: string;
  rating: number | null;
  comment: string;
  createdAt: string;
};

export type PublicReview = Pick<SafeReview, "id" | "listingId" | "rating" | "comment" | "createdAt"> & {
  user: {
    name: string | null;
    image: string | null;
  };
};
