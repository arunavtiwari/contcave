"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteAccount } from "@/app/actions/profileActions";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { formatISTDateTime } from "@/lib/utils";
import { SafeUser } from "@/types/user";

type Props = {
  profile: SafeUser | null;
};

const ProfileSettings = ({ profile }: Props) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markedForDeletionAt = useMemo(() => {
    return formatISTDateTime(profile?.markedForDeletionAt);
  }, [profile?.markedForDeletionAt]);

  const handleDeleteRequest = async () => {
    setIsSubmitting(true);
    try {
      await deleteAccount();
      toast.success("Account scheduled for deletion. Log in again to cancel.");
      setShowConfirmModal(false);
      await signOut({ callbackUrl: "/" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to update account status.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8">
      <Heading title="Settings" subtitle="Manage your account settings." />
      <div className="flex flex-col gap-8">
        <div className="pl-4">
          <ul className="list-decimal flex flex-col gap-5">
            <li>
              <div className="text-lg font-bold text-foreground">Support</div>
              <ul className="list-disc pl-4">
                <li>Access help resources, FAQs, or contact customer support.</li>
                <li>Help Center</li>
                <li>Contact Support</li>
              </ul>
            </li>
            <li>
              <div className="text-lg font-bold text-foreground">Legal & Compliance</div>
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
              <div className="text-lg font-bold text-foreground">Feedback & Surveys</div>
              <ul className="list-disc pl-4">
                <li>Provide feedback or participate in surveys to improve the platform.</li>
                <li>Submit Feedback</li>
                <li>Take Survey</li>
              </ul>
            </li>
          </ul>
        </div>
        <div className="bg-destructive/5 p-6 rounded-2xl border border-destructive/20">
          <Heading title="Danger Zone" variant="h5" className="mb-4 text-destructive" />
          <p className="text-destructive text-base font-bold mb-1">Delete Account</p>
          <p className="text-muted-foreground font-medium text-sm">
            <span className="italic">Warning:</span> Deleting your account will permanently remove all
            your data and cannot be undone.
          </p>

          {profile?.markedForDeletion && (
            <div className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-background p-4 text-sm text-destructive">
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

          <Button
            label="DELETE ACCOUNT"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            variant="destructive"
            outline
            classNames="w-fit! mt-6"
          />
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
        customHeight="h-fit"
        body={
          <div className="space-y-3 text-sm text-muted-foreground">
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

