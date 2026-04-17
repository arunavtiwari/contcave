"use client";

import React, { useActionState } from "react";

import approveListing from "@/app/actions/approveListing";
import rejectListing from "@/app/actions/rejectListing";
import Button from "@/components/ui/Button";

type Props = {
    listingId: string;
    previewUrl: string;
};

export default function ListingActions({ listingId, previewUrl }: Props) {
    const [approveState, approveAction, approvePending] = useActionState(approveListing, {});
    const [rejectState, rejectAction, rejectPending] = useActionState(rejectListing, {});

    return (
        <div className="flex items-center justify-end gap-2">
            <Button
                label="Preview"
                variant="outline"
                size="sm"
                href={previewUrl}
                target="_blank"
            />
            <form action={approveAction}>
                <input type="hidden" name="listingId" value={listingId} />
                <Button
                    label="Approve"
                    variant="success"
                    size="sm"
                    loading={approvePending}
                />
            </form>
            <form action={rejectAction}>
                <input type="hidden" name="listingId" value={listingId} />
                <Button
                    label="Reject"
                    variant="danger"
                    size="sm"
                    loading={rejectPending}
                />
            </form>
            {(approveState?.error || rejectState?.error) && (
                <span className="text-xs text-red-500">
                    {approveState?.error || rejectState?.error}
                </span>
            )}
        </div>
    );
}
