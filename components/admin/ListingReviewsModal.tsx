"use client";

import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { IoLogoWhatsapp } from "react-icons/io";
import { toast } from "sonner";

import getReviews from "@/app/actions/getReviews";
import { addWhatsAppReviewAction, deleteReviewAction } from "@/app/actions/reviewActions";
import Modal from "@/components/modals/Modal";
import Avatar from "@/components/ui/Avatar";
import Pill from "@/components/ui/Pill";
import StarRating from "@/components/ui/StarRating";
import { formatISTDate } from "@/lib/utils";

interface ReviewRow {
    id: string;
    comment: string;
    rating: number | null;
    createdAt: string | Date;
    source?: "PLATFORM" | "WHATSAPP" | null;
    guestName?: string | null;
    user: { name: string | null; image: string | null } | null;
}

const EMPTY_FORM = { guestName: "", guestRole: "", rating: 5, comment: "" };

export default function ListingReviewsModal({
    listing,
    onClose,
}: {
    listing: { id: string; title: string } | null;
    onClose: () => void;
}) {
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!listing) return;
        setForm(EMPTY_FORM);
        setLoading(true);
        getReviews(listing.id)
            .then((data) => setReviews((data as ReviewRow[]) || []))
            .catch(() => toast.error("Couldn't load reviews"))
            .finally(() => setLoading(false));
    }, [listing]);

    if (!listing) return null;

    const refresh = async () => {
        const data = await getReviews(listing.id);
        setReviews((data as ReviewRow[]) || []);
    };

    const handleAdd = async () => {
        if (form.guestName.trim().length < 2) {
            toast.error("Guest name is required");
            return;
        }
        if (form.comment.trim().length < 10) {
            toast.error("Paste a bit more of the message — at least 10 characters");
            return;
        }

        setSubmitting(true);
        const res = await addWhatsAppReviewAction({
            listingId: listing.id,
            guestName: form.guestName,
            guestRole: form.guestRole || undefined,
            rating: form.rating,
            comment: form.comment,
        });
        setSubmitting(false);

        if (!res.success) {
            toast.error(res.error || "Couldn't add review");
            return;
        }

        toast.success("Review added");
        setForm(EMPTY_FORM);
        await refresh();
    };

    const handleDelete = async (reviewId: string) => {
        setDeletingId(reviewId);
        const res = await deleteReviewAction({ reviewId, listingId: listing.id });
        setDeletingId(null);

        if (!res.success) {
            toast.error(res.error || "Couldn't delete review");
            return;
        }
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    };

    return (
        <Modal
            isOpen={Boolean(listing)}
            onCloseAction={onClose}
            onSubmitAction={onClose}
            title={`Reviews — ${listing.title}`}
            actionLabel="Close"
            selfActionButton
            customWidth="w-full max-w-2xl"
            customHeight="max-h-[88vh]"
            body={
                <div className="space-y-6" data-testid="admin-listing-reviews-modal">
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <IoLogoWhatsapp className="text-[#25D366]" size={18} />
                            Add a review from WhatsApp
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input
                                value={form.guestName}
                                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                                placeholder="Guest name"
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                            />
                            <input
                                value={form.guestRole}
                                onChange={(e) => setForm({ ...form, guestRole: e.target.value })}
                                placeholder="Role · context (optional)"
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                            />
                        </div>
                        <textarea
                            value={form.comment}
                            onChange={(e) => setForm({ ...form, comment: e.target.value })}
                            placeholder="Paste the WhatsApp message"
                            rows={4}
                            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">Rating</span>
                                <StarRating
                                    interactive
                                    rating={form.rating}
                                    onRate={(v) => setForm({ ...form, rating: v })}
                                    size={18}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={submitting}
                                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? "Adding…" : "Add review"}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading reviews…</p>
                        ) : reviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No reviews yet.</p>
                        ) : (
                            reviews.map((rv) => (
                                <div key={rv.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                                    <Avatar src={rv.user?.image} size={36} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {rv.user?.name || rv.guestName || "Guest"}
                                            </span>
                                            {rv.source === "WHATSAPP" && (
                                                <Pill label="via WhatsApp" size="xs" variant="neutral" />
                                            )}
                                            {rv.rating != null && <StarRating rating={rv.rating} size={11} />}
                                        </div>
                                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{rv.comment}</p>
                                        <div className="mt-1 text-[11px] text-muted-foreground/70">
                                            {formatISTDate(rv.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                    </div>
                                    {rv.source === "WHATSAPP" && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(rv.id)}
                                            disabled={deletingId === rv.id}
                                            aria-label="Delete review"
                                            className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50 cursor-pointer"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            }
        />
    );
}
