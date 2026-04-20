"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";

import { approveListingAction, rejectListingAction } from "@/app/actions/listingActions";
import Button from "@/components/ui/Button";

type Props = {
    listingId: string;
    previewUrl: string;
};

export default function ListingActions({ listingId, previewUrl }: Props) {
    const [isApprovePending, startApproveTransition] = useTransition();
    const [isRejectPending, startRejectTransition] = useTransition();

    const handleApprove = () => {
        startApproveTransition(async () => {
            const res = await approveListingAction(listingId);
            if (res.success) {
                toast.success("Listing approved");
            } else {
                toast.error(res.error || "Failed to approve listing");
            }
        });
    };

    const handleReject = () => {
        startRejectTransition(async () => {
            const res = await rejectListingAction(listingId);
            if (res.success) {
                toast.success("Listing rejected");
            } else {
                toast.error(res.error || "Failed to reject listing");
            }
        });
    };

    return (
        <div className="flex items-center justify-end gap-2">
            <Button
                label="Preview"
                variant="outline"
                size="sm"
                href={previewUrl}
                target="_blank"
            />
            <Button
                label="Approve"
                variant="success"
                size="sm"
                loading={isApprovePending}
                onClick={handleApprove}
            />
            <Button
                label="Reject"
                variant="destructive"
                size="sm"
                loading={isRejectPending}
                onClick={handleReject}
            />
        </div>
    );
}
