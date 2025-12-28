"use client";
import { useMemo, useState } from "react";
import Heading from "@/components/Heading";
import Link from "next/link";
import Modal from "@/components/modals/Modal";
import { toast } from "react-toastify";
import { SafeUser } from "@/types/user";
import { signOut } from "next-auth/react";

type Props = {
  profile: SafeUser | null;
};

const ProfileSettings = ({ profile }: Props) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markedForDeletionAt = useMemo(() => {
    if (!profile?.markedForDeletionAt) return null;
    const date = new Date(profile.markedForDeletionAt);
    if (Number.isNaN(date.valueOf())) return null;
    return date.toLocaleString();
  }, [profile?.markedForDeletionAt]);

  const handleDeleteRequest = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to mark account for deletion");
      }
      toast.success("Account scheduled for deletion. Log in again to cancel.");
      setShowConfirmModal(false);
      await signOut({ callbackUrl: "/" });
    } catch (error: any) {
      toast.error(error?.message || "Unable to update account status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <Heading title="Settings" subtitle="Manage your account settings." />
      <div className="flex flex-col gap-5 sm:gap-8">
        <div className="pl-4">
          <ul className="list-decimal flex flex-col gap-5">
            <li>
              <div className="text-lg font-bold text-slate-950">Support</div>
              <ul className="list-disc pl-4">
                <li>Access help resources, FAQs, or contact customer support.</li>
                <li>Help Center</li>
                <li>Contact Support</li>
              </ul>
            </li>
            <li>
              <div className="text-lg font-bold text-slate-950">Legal & Compliance</div>
              <ul className="list-disc pl-4">
                <li>Links to terms of service, privacy policy, and other legal documents</li>
                <li>
                  <Link href="/terms-and-conditions">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/privacy-policy">Privacy Policy</Link>
                </li>
              </ul>
            </li>
            <li>
              <div className="text-lg font-bold text-slate-950">Feedback & Surveys</div>
              <ul className="list-disc pl-4">
                <li>Provide feedback or participate in surveys to improve the platform.</li>
                <li>Submit Feedback</li>
                <li>Take Survey</li>
              </ul>
            </li>
          </ul>
        </div>
        <div className="bg-neutral-100 p-5 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Danger Zone</h2>
          <p className="text-red-700 text-base font-bold">Delete Account</p>
          <p className="text-slate-600 font-medium text-sm">
            <span className="italic">Warning:</span> Deleting your account will permanently remove all
            your data and cannot be undone.
          </p>

          {profile?.markedForDeletion && (
            <div className="mt-3 rounded-lg border border-dashed border-red-400 bg-white p-3 text-sm text-red-700">
              Account deletion requested
              {markedForDeletionAt ? (
                <>
                  {" "}
                  on <span className="font-semibold">{markedForDeletionAt}</span>. Re-login to cancel.
                </>
              ) : (
                "."
              )}
            </div>
          )}

          <button
            className="border-2 border-red px-10 py-1.5 rounded-full hover:opacity-85 text-red shadow-xs mt-3 text-sm font-semibold disabled:opacity-60"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
          >
            DELETE
          </button>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => (isSubmitting ? null : setShowConfirmModal(false))}
        onSubmit={handleDeleteRequest}
        title="Confirm deletion"
        actionLabel={isSubmitting ? "Processing..." : "Yes, delete my account"}
        secondaryAction={() => setShowConfirmModal(false)}
        secondaryActionLabel="Cancel"
        disabled={isSubmitting}
        body={
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Are you sure you want to delete your ContCave account? Your listings, reservations, and
              billing records will be permanently removed once the deletion request is processed.
            </p>
            <p>
              You can undo this later by simply logging back in before the deletion is finalized. This
              will automatically cancel the request.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default ProfileSettings;
