import type { Prisma, Reservation } from "@prisma/client";

import type { safeListing } from "@/types/listing";

export type PublicReservationSlot = {
    startDate: string;
    startTime: string;
    endTime: string;
    setIds: string[];
};

export type SafeReservation = Omit<
    Reservation,
    | "createdAt"
    | "startDate"
    | "listing"
    | "markedForDeletionAt"
    | "pricingSnapshot"
    | "checkedInAt"
    | "completedAt"
    | "noShowAt"
    | "refundRecordedAt"
    | "isApproved"
    | "billingDetailId"
    | "billingSnapshot"
    | "extensionNudgeSentAt"
    | "reminderSent"
    | "reviewReminderSentAt"
    | "reviewReminderClaimedAt"
    | "reviewReminderAttempts"
    | "unreadCountOwner"
    | "unreadCountGuest"
    | "lastMessageText"
    | "lastMessageAt"
    | "updatedAt"
> & {
    createdAt: string;
    startDate: string;
    startTime: string;
    endTime: string;
    listing: safeListing;
    markedForDeletionAt: string | null;
    rejectReason?: string | null;
    setIds?: string[];
    includedSetId?: string | null;
    setPackageId?: string | null;
    bookedSets?: Array<{
        id: string;
        name: string;
        description?: string | null;
        price: number;
    }>;
    bookingAmenities?: string[];
    pricingSnapshot?: Prisma.JsonValue | null;
    totalPriceInt?: number | null;
    status: Reservation["status"];
    checkedInAt?: string | null;
    completedAt?: string | null;
    noShowAt?: string | null;
    refundAmount?: number | null;
    refundRecordedAt?: string | null;
    refundNote?: string | null;
    pendingExtensionCount?: number;
    pendingChargeCount?: number;
    pendingCharges?: Array<{
        id: string;
        type: "SERVICE" | "DAMAGE";
        items?: Prisma.JsonValue;
        totalAmount: number;
        status: string;
        note?: string | null;
    }>;
    pendingExtensions?: Array<{
        id: string;
        durationMinutes: number;
        extraAmount: number;
        status: string;
        requestedEndTime: string;
    }>;
    receipts?: Array<{
        invoiceNumber: string;
        invoiceUrl: string;
    }>;
};

export type ReservationResult = {
    reservationId: string;
    bookingId: string;
    isInstant: boolean;
    created?: boolean;
};

export interface ReservationMetadata {
    startDate: string;
    startTime: string;
    endTime: string;
    setIds: string[];
    selectedAddons?: Prisma.JsonValue | string;
    pricingSnapshot?: Prisma.JsonValue | string;
    billingDetailId?: string | null;
    billingSnapshot?: Prisma.JsonValue | string | null;
    setPackageId?: string | null;
}
