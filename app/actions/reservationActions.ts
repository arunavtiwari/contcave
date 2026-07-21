"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import { PostBookingService } from "@/lib/post-booking/service";
import { ReservationService } from "@/lib/reservation/service";
import {
    additionalChargeIdSchema,
    cancelReservationSchema,
    checkBookingSchema,
    createAdditionalChargeSchema,
    createExtensionRequestSchema,
    deleteReservationSchema,
    extensionRequestIdSchema,
    recordRefundSchema,
    reservationIdSchema,
    updateAdditionalChargeSchema,
    updateReservationSchema
} from "@/schemas/reservation";
import { UserRole } from "@/types/user";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid listing ID");

export async function getPublicReservationSlots(listingId: string) {
    const parsed = objectIdSchema.safeParse(listingId);
    if (!parsed.success) return [];
    return await ReservationService.getPublicReservationSlots(parsed.data);
}

export async function getPublicDayStatuses(listingId: string) {
    const parsed = objectIdSchema.safeParse(listingId);
    if (!parsed.success) return [];
    return await ReservationService.getPublicDayStatuses(parsed.data);
}

export async function getReservations(params: { listingId?: string }) {
    if (!params.listingId) return [];
    return await getPublicReservationSlots(params.listingId);
}

export async function getReservationsPageAction(
    params: { listingId?: string; userId?: string; authorId?: string },
    options: { page?: number; pageSize?: number } = {}
) {
    const empty = {
        reservations: [],
        pagination: {
            page: 1,
            pageSize: typeof options.pageSize === "number" && Number.isFinite(options.pageSize)
                ? Math.min(100, Math.max(1, Math.floor(options.pageSize)))
                : 50,
            total: 0,
            totalPages: 1,
        },
    };
    try {
        if (params.listingId && !/^[a-f\d]{24}$/i.test(params.listingId)) return empty;
        if (params.userId && !/^[a-f\d]{24}$/i.test(params.userId)) return empty;
        if (params.authorId && !/^[a-f\d]{24}$/i.test(params.authorId)) return empty;
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return empty;
        const isAdmin = currentUser.role === UserRole.ADMIN;
        const requestedIdentity = params.userId || params.authorId;
        if (!requestedIdentity || (!isAdmin && requestedIdentity !== currentUser.id)) return empty;
        if (params.listingId && !isAdmin) return empty;
        return await ReservationService.getReservationsPage(params, options);
    } catch (error) {
        console.error("[getReservationsPageAction] Error:", error);
        throw error;
    }
}

export const cancelReservationAction = createAction(
    cancelReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.cancel(data.reservationId, user.id);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const updateReservationAction = createAction(
    updateReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.updateStatus(data.reservationId, user.id, data.status, data.rejectReason, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        return { success: true };
    }
);

export const approveReservationAction = createAction(
    reservationIdSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.approve(data.reservationId, user.id, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const checkInReservationAction = createAction(
    reservationIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await ReservationService.checkIn(data.reservationId, user.id, { allowAdmin: user.role === UserRole.ADMIN });
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/chat");
        return { success: true };
    }
);

export const completeReservationAction = createAction(
    reservationIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await ReservationService.complete(data.reservationId, user.id, { allowAdmin: user.role === UserRole.ADMIN });
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        revalidatePath("/dashboard/chat");
        return { success: true };
    }
);

export const markNoShowReservationAction = createAction(
    reservationIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await ReservationService.markNoShow(data.reservationId, user.id, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        return { success: true };
    }
);

export const createExtensionRequestAction = createAction(
    createExtensionRequestSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        const result = await PostBookingService.createExtensionRequest({
            reservationId: data.reservationId,
            ownerId: user.id,
            allowAdmin: user.role === UserRole.ADMIN,
            durationMinutes: data.durationMinutes,
            extraAmount: data.extraAmount,
        });
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return result;
    }
);

export const getExtensionAvailabilityAction = createAction(
    reservationIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        return await PostBookingService.getExtensionAvailability(data.reservationId, user.id, user.role === UserRole.ADMIN);
    }
);

export const cancelExtensionRequestAction = createAction(
    extensionRequestIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await PostBookingService.cancelExtensionRequest(data.extensionRequestId, user.id, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const createAdditionalChargeAction = createAction(
    createAdditionalChargeSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        const result = await PostBookingService.createAdditionalCharge({
            reservationId: data.reservationId,
            ownerId: user.id,
            allowAdmin: user.role === UserRole.ADMIN,
            type: data.type,
            items: data.items,
            note: data.note,
        });
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return result;
    }
);

export const cancelAdditionalChargeAction = createAction(
    additionalChargeIdSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await PostBookingService.cancelAdditionalCharge(data.additionalChargeId, user.id, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const updateAdditionalChargeAction = createAction(
    updateAdditionalChargeSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await PostBookingService.updateAdditionalCharge({
            chargeId: data.additionalChargeId,
            ownerId: user.id,
            allowAdmin: user.role === UserRole.ADMIN,
            items: data.items,
            note: data.note,
        });
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const rejectAdditionalChargeAction = createAction(
    additionalChargeIdSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await PostBookingService.rejectAdditionalCharge(data.additionalChargeId, user.id);
        revalidatePath("/dashboard/bookings");
        revalidatePath("/dashboard/reservations");
        return { success: true };
    }
);

export const createExtensionPaymentLinkAction = createAction(
    extensionRequestIdSchema,
    { requireAuth: true },
    async (data, { user }) => {
        const paymentUrl = await PostBookingService.createExtensionPaymentLinkForCustomer(data.extensionRequestId, user.id);
        return { paymentUrl };
    }
);

export const createChargePaymentLinkAction = createAction(
    additionalChargeIdSchema,
    { requireAuth: true },
    async (data, { user }) => {
        const paymentUrl = await PostBookingService.createChargePaymentLinkForCustomer(data.additionalChargeId, user.id);
        return { paymentUrl };
    }
);

export const recordRefundAction = createAction(
    recordRefundSchema,
    { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
    async (data, { user }) => {
        await ReservationService.recordRefund({
            reservationId: data.reservationId,
            adminId: user.id,
            status: data.status,
            amount: data.amount,
            note: data.note,
        });
        revalidatePath("/admin/dashboard/bookings");
        revalidatePath("/dashboard/bookings");
        revalidatePath("/dashboard/reservations");
        return { success: true };
    }
);

export const deleteReservationAction = createAction(
    deleteReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.delete(data.reservationId, user.id, user.role === UserRole.ADMIN);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/bookings");
        return { success: true };
    }
);

export const checkBookingAction = createAction(
    checkBookingSchema,
    { requireAuth: false, includeUser: true },
    async (data, { user }) => {
        if (!user?.id) return null;
        return await ReservationService.checkUserBooking(user.id, data.listingId);
    }
);
