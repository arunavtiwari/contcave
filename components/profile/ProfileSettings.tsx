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
      const result = await deleteAccount(undefined);
      if (!result.success) throw new Error(result.error || "Unable to update account status.");
      toast.success("Account deactivated. Sign in again to restore it.");
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
          <p className="text-destructive text-base font-bold mb-1">Deactivate Account</p>
          <p className="text-muted-foreground font-medium text-sm">
            Deactivation signs you out and hides your active listings. Your account and records are retained,
            and signing in again restores the account and listings that were active when you deactivated it.
          </p>

          {profile?.markedForDeletion && (
            <div className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-background p-4 text-sm text-destructive">
              Account deactivation requested
              {markedForDeletionAt ? (
                <>
                  {" "}
                  on <span className="font-semibold">{markedForDeletionAt}</span>. Sign in again to restore it.
                </>
              ) : (
                "."
              )}
            </div>
          )}

          <Button
            label="DEACTIVATE ACCOUNT"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            variant="destructive"
            outline
            className="w-fit! mt-6"
          />
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onCloseAction={() => (isSubmitting ? null : setShowConfirmModal(false))}
        onSubmitAction={handleDeleteRequest}
        title="Confirm deactivation"
        actionLabel={isSubmitting ? "Processing..." : "Yes, deactivate my account"}
        secondaryActionAction={() => setShowConfirmModal(false)}
        secondaryActionLabel="Cancel"
        disabled={isSubmitting}
        customHeight="h-fit"
        body={
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Are you sure you want to deactivate your ContCave account? You will be signed out and your
              active listings will be hidden, while reservations and billing records remain retained.
            </p>
            <p>
              You can restore the account later by signing in again. Listings that were active when the
              account was deactivated will be restored automatically.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default ProfileSettings;
