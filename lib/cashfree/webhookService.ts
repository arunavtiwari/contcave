import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { checkSetConflicts } from "@/lib/availability";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfCreateRefund, cfMapStatus, cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
import { calculatePayoutDetails } from "@/lib/constants/gst";
import { AttachmentInput, sendTemplateEmail } from "@/lib/email/mailer";
import { sendReservationCustomerEmail } from "@/lib/email/reservationCustomer";
import { sendReservationOwnerEmail } from "@/lib/email/reservationOwner";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import prisma from "@/lib/prismadb";
import { WhatsappService } from "@/lib/whatsapp/service";

type LocationData = {
  display_name?: string;
  additionalInfo?: string;
  [key: string]: unknown;
};

type CashfreeWebhookPayload = {
  data?: {
    order?: {
      order_id?: string;
    };
    payment?: {
      payment_status?: string;
      cf_payment_id?: string | number;
    };
  };
  [key: string]: unknown;
};

type AddonItem = {
  name?: unknown;
  qty?: unknown;
  [key: string]: unknown;
};

type TransactionMetadata = {
  startDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  selectedAddons?: unknown;
  setIds?: unknown;
  setPackageId?: unknown;
  pricingSnapshot?: unknown;
  [key: string]: unknown;
};

type ListingSetData = {
  id: string;
  name: string;
  price: number;
  position: number;
};

type PricingSnapshotData = {
  includedSetName?: string | null;
  packageTitle?: string | null;
  additionalSets?: Array<{ id: string; name: string; price: number }>;
  [key: string]: unknown;
};

type ListingWithSetsAndUser = {
  id: string;
  title?: string;
  instantBooking?: boolean;
  actualLocation?: unknown;
  sets?: ListingSetData[];
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    googleCalendarConnected?: boolean;
    paymentDetails?: { cashfreeVendorId?: string | null } | null;
  } | null;
};

const MAX_SKEW_SEC = Number(process.env.WEBHOOK_MAX_SKEW_SEC || 600);

type HandleInput = {
  raw: string;
  headers: { timestamp: string; signature: string; strict: boolean };
};

function parseWebhookTimestamp(ts: string): number | null {
  if (!ts) return null;
  if (/^\d+$/.test(ts)) {
    const n = Number(ts);
    return n > 1e12 ? n : n * 1000;
  }
  const d = Date.parse(ts);
  return Number.isFinite(d) ? d : null;
}
function fresh(tsHeader: string): boolean {
  const t = parseWebhookTimestamp(tsHeader);
  if (!t) return false;
  const skew = Math.abs(Date.now() - t) / 1000;
  return skew <= MAX_SKEW_SEC;
}

function pickOrderId(p: CashfreeWebhookPayload) {
  return String(p?.data?.order?.order_id ?? "");
}
function pickPayStatus(p: CashfreeWebhookPayload) {
  return String(p?.data?.payment?.payment_status ?? "");
}
function pickPaymentId(p: CashfreeWebhookPayload) {
  const r = p?.data?.payment?.cf_payment_id;
  return r != null ? String(r) : undefined;
}
function localMidnightFromYmd(ymd?: string): Date {
  return typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(`${ymd}T00:00:00`) : new Date();
}
function formatAddons(a: unknown): string {
  const arr = Array.isArray(a) ? a : a && typeof a === "object" ? Object.values(a as Record<string, unknown>) : [];
  const parts = arr
    .map((x: unknown) => {
      if (!x || typeof x !== 'object') return null;
      const item = x as AddonItem;
      const name = String(item?.name || "").trim();
      const qty = Number(item?.qty || 0);
      return name && qty > 0 ? `${name} × ${qty}` : null;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "None";
}

type OwnerCalendarPayload = { ownerUserId: string; title: string; startIso: string; endIso: string };
async function createCalendarEventForOwner(p: OwnerCalendarPayload) {
  try {
    await ensureCalendarEventForUser({
      userId: p.ownerUserId,
      title: p.title,
      startIso: p.startIso,
      endIso: p.endIso,
    });
  } catch {
  }
}

function combineUtcIso(ymd: string, hm: string): string {
  const time = /^(\d{2}):(\d{2})$/.test(hm) ? hm : "00:00";
  return new Date(`${ymd}T${time}:00Z`).toISOString();
}

type CustomerEmailPayload = Parameters<typeof sendReservationCustomerEmail>[0];
type OwnerEmailPayload = Parameters<typeof sendReservationOwnerEmail>[0];

type ExtendedCustomerEmailPayload = CustomerEmailPayload & {
  setNames?: string;
  packageTitle?: string | null;
};

type ExtendedOwnerEmailPayload = OwnerEmailPayload & {
  setNames?: string;
  packageTitle?: string | null;
  bookingId?: string;
  addons?: string;
  formattedStartDate?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
};

async function claimAndSendCustomerEmail(
  txnId: string,
  payload: CustomerEmailPayload,
) {
  const claimed = await prisma.transaction.updateMany({
    where: { id: txnId, emailSentCustomer: false },
    data: { emailSentCustomer: true },
  });
  if (claimed.count === 1) {
    try {
      await sendReservationCustomerEmail(payload);

      if (payload.toEmail) {


      }
    } catch (e) {
      await prisma.transaction.update({ where: { id: txnId }, data: { emailSentCustomer: false } });
      throw e;
    }
  }
}
async function claimAndSendOwnerEmail(
  txnId: string,
  payload: OwnerEmailPayload,
) {
  if (!payload?.toEmail) {
    console.warn("Owner email skipped: missing recipient", { txnId });
    return;
  }
  const tpl = (payload as { templateId?: unknown }).templateId;
  const templateId = typeof tpl === 'string' ? tpl : process.env.MS_TPL_RESERVATION_OWNER;
  if (!templateId) {
    console.warn("Owner email skipped: missing templateId", { txnId });
    return;
  }
  const claimed = await prisma.transaction.updateMany({
    where: { id: txnId, emailSentOwner: false },
    data: { emailSentOwner: true },
  });
  if (claimed.count === 1) {
    try {
      await sendReservationOwnerEmail(payload);
    } catch (e) {
      await prisma.transaction.update({ where: { id: txnId }, data: { emailSentOwner: false } });
      throw e;
    }
  }
}
async function claimAndSendFailedEmail(
  txnId: string,
  payload: { toEmail: string; toName: string; templateId: string; data: Record<string, string | number | boolean | null> }
) {
  const claimed = await prisma.transaction.updateMany({
    where: { id: txnId, emailSentFailed: false },
    data: { emailSentFailed: true },
  });
  if (claimed.count === 1) {
    try {
      await sendTemplateEmail(payload);
    } catch (e) {
      await prisma.transaction.update({ where: { id: txnId }, data: { emailSentFailed: false } });
      throw e;
    }
  }
}

export async function handleCashfreeWebhook(input: HandleInput): Promise<{ statusCode: number }> {
  try {
    const { raw, headers } = input;

    if (headers.strict) {
      const okSig =
        headers.timestamp &&
        headers.signature &&
        cfVerifyWebhookSignature({ rawBody: raw, timestamp: headers.timestamp, signatureBase64: headers.signature });
      if (!okSig || !fresh(headers.timestamp)) return { statusCode: 401 };
    }

    let body: CashfreeWebhookPayload;
    try {
      body = JSON.parse(raw);
    } catch {
      return { statusCode: 200 };
    }

    const orderId = pickOrderId(body);
    if (!orderId) return { statusCode: 200 };

    const cfPaymentId = pickPaymentId(body);
    const status = cfMapStatus(pickPayStatus(body));
    console.warn("[Webhook] Cashfree payment status", { orderId, status, cfPaymentId });

    const txn = await prisma.transaction.findFirst({
      where: { cfOrderId: orderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        reservationId: true,
        userId: true,
        listingId: true,
        amount: true,
        metadata: true,
        cfPaymentId: true,
      },
    });
    if (!txn) return { statusCode: 200 };

    if (txn.status !== status || txn.cfPaymentId !== cfPaymentId) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { status, cfPaymentId, cfWebhookPayload: body as never, cfSignature: headers.signature || undefined },
      });
    }

    let afterCustomer: CustomerEmailPayload | undefined;
    let afterOwner: OwnerEmailPayload | undefined;
    let afterTxnId: string | undefined;
    let afterCalendar: OwnerCalendarPayload | undefined;
    let afterReservationId: string | undefined;
    let afterInvoiceAttachment: AttachmentInput | undefined;

    if (status === "SUCCESS" && txn.userId && txn.listingId) {
      await prisma.$transaction(async (db) => {
        const freshTxn = await db.transaction.findUnique({
          where: { id: txn.id },
          select: { id: true, reservationId: true, userId: true, listingId: true, amount: true, metadata: true, cfOrderId: true, cfTxnRef: true },
        });
        if (!freshTxn) return;

        if (!freshTxn.reservationId) {
          const [listingResult, user] = await Promise.all([
            db.listing.findUnique({
              where: { id: freshTxn.listingId! },
              include: {
                user: {
                  include: {
                    paymentDetails: true
                  }
                },
                sets: { orderBy: { position: "asc" as const } },
              },
            }),
            db.user.findUnique({ where: { id: freshTxn.userId! }, select: { email: true, name: true, phone: true } }),
          ]);
          const listing = listingResult as ListingWithSetsAndUser | null;

          const md = (freshTxn.metadata || {}) as TransactionMetadata;
          const startDateYmd = String(md.startDate || "");
          const startDate = localMidnightFromYmd(startDateYmd);
          const startTime = String(md.startTime ?? "");
          const endTime = String(md.endTime ?? "");

          const setIds = Array.isArray(md.setIds) ? md.setIds.filter((id): id is string => typeof id === "string") : [];
          const setPackageId = typeof md.setPackageId === "string" ? md.setPackageId : null;
          const pricingSnapshot = md.pricingSnapshot || null;

          let includedSetId: string | null = null;
          if (setIds.length > 0 && listing?.sets) {
            const selectedSets = listing.sets
              .filter((s: ListingSetData) => setIds.includes(s.id))
              .sort((a: ListingSetData, b: ListingSetData) => {
                if (a.price !== b.price) return a.price - b.price;
                return a.position - b.position;
              });
            includedSetId = selectedSets[0]?.id || null;
          }

          const conflict = await checkSetConflicts({
            listingId: freshTxn.listingId!,
            date: startDate,
            startTime,
            endTime,
            setIds,
            tx: db,
          });

          if (conflict.hasConflict) {
            console.error("[Webhook] Double Booking Detected!", { txnId: freshTxn.id, conflict });

            // Auto-Refund Logic
            let refundStatus = "PENDING";
            let refundError = null;

            if (freshTxn.cfOrderId) {
              try {
                const refundId = `ref_${freshTxn.cfTxnRef}`;
                await cfCreateRefund({
                  order_id: freshTxn.cfOrderId,
                  refund_amount: freshTxn.amount,
                  refund_id: refundId,
                  refund_note: "System Auto-Refund: Double Booking"
                });
                refundStatus = "INITIATED";
                console.warn("[Webhook] Auto-Refund Initiated", { refundId });
              } catch (err) {
                console.error("[Webhook] Auto-Refund Failed", err);
                refundStatus = "FAILED";
                refundError = err instanceof Error ? err.message : "Unknown error";
              }
            }

            await db.transaction.update({
              where: { id: freshTxn.id },
              data: {
                status: "FAILED",
                metadata: {
                  ...(typeof freshTxn.metadata === 'object' && freshTxn.metadata ? freshTxn.metadata : {}),
                  failureReason: "DOUBLE_BOOKING_CONFLICT",
                  conflictDetails: conflict as unknown as Prisma.InputJsonObject,
                  refundNeeded: refundStatus === "FAILED",
                  autoRefundStatus: refundStatus,
                  autoRefundError: refundError
                },
              },
            });
            return;
          }

          const reservation = await db.reservation.create({
            data: {
              userId: freshTxn.userId!,
              listingId: freshTxn.listingId!,
              startDate,
              startTime,
              endTime,
              totalPrice: freshTxn.amount,
              selectedAddons: (md.selectedAddons ?? null) as Prisma.InputJsonValue,
              isApproved: (listing?.instantBooking ? 1 : 0),
              Transaction: { connect: { id: freshTxn.id } },
              setIds,
              includedSetId,
              setPackageId,
              pricingSnapshot: pricingSnapshot as Prisma.InputJsonValue,
              totalPriceInt: Math.round(freshTxn.amount),
            },
          });

          // Calculate GST ownership and payout based on studio's GST status
          const rawStudioPaymentDetails = listing?.user?.paymentDetails;
          let studioHasGST = false;
          let plainVendorId: string | undefined = undefined;

          if (rawStudioPaymentDetails) {
            try {
              const { decryptPaymentDetailsInternal } = await import("@/lib/payment-details");
              const decrypted = decryptPaymentDetailsInternal(rawStudioPaymentDetails as import("@prisma/client").PaymentDetails);

              studioHasGST = !!(decrypted.companyName && decrypted.gstin);
              plainVendorId = decrypted.cashfreeVendorId || undefined;
            } catch (error) {
              console.error("[Webhook] Failed to decrypt studio payment details:", error);
            }
          }

          const payoutDetails = calculatePayoutDetails(freshTxn.amount, studioHasGST);

          console.warn("[Webhook] GST Calculation", {
            txnId: freshTxn.id,
            totalAmount: freshTxn.amount,
            studioHasGST,
            gstOwnedBy: payoutDetails.gstOwnedBy,
            baseAmount: payoutDetails.baseAmount,
            payoutToStudio: payoutDetails.payoutToStudio,
            payoutPercent: payoutDetails.payoutPercentOfTotal,
            arkanetRetains: payoutDetails.arkanetRetains,
          });

          await db.transaction.update({
            where: { id: freshTxn.id },
            data: {
              reservationId: reservation.id,
              vendorId: plainVendorId,
              payoutPercentToOwner: payoutDetails.payoutPercentOfTotal,
              payoutDueAt: startDate,
              gstOwnedBy: payoutDetails.gstOwnedBy,
              baseAmountBeforeGst: payoutDetails.baseAmount,
            },
          });

          afterReservationId = reservation.id;

          const studioName = listing?.title || "";
          const actualLocation = listing?.actualLocation as LocationData;
          const studioLocation = actualLocation?.display_name || "";
          const additionalInfo = actualLocation?.additionalInfo || "";
          const addonsStr = formatAddons(md.selectedAddons);
          const totalPrice = Math.round(Number(freshTxn.amount || 0));
          afterTxnId = freshTxn.id;

          const ps = pricingSnapshot as PricingSnapshotData | null;
          const setNames = [
            ps?.includedSetName,
            ...(ps?.additionalSets?.map((s) => s.name) || [])
          ].filter(Boolean).join(", ");
          const packageTitle = ps?.packageTitle || null;

          if (user?.email) {
            afterCustomer = {
              toEmail: user.email,
              toName: user.name || "",
              studioName,
              startDate: startDateYmd,
              startTime,
              endTime,
              totalPrice,
              addons: addonsStr,
              studioLocation,
              additionalInfo,
              setNames,
              packageTitle,
            } as ExtendedCustomerEmailPayload;
            console.warn('[Webhook] Customer email prepared', { txnId: freshTxn.id, toEmail: user.email });
          }
          if (listing?.user?.email) {
            afterOwner = {
              toEmail: listing.user.email,
              toName: listing.user.name || "",
              studioName,
              startDate: startDateYmd,
              startTime,
              endTime,
              totalPrice,
              customerName: user?.name || "",
              templateId: process.env.MS_TPL_RESERVATION_OWNER || "",
              setNames,
              packageTitle,
            } as ExtendedOwnerEmailPayload;
            afterOwner.bookingId = reservation.id;
            afterOwner.addons = addonsStr;
            afterOwner.formattedStartDate = startDateYmd;
            afterOwner.formattedStartTime = startTime;
            afterOwner.formattedEndTime = endTime;
            if (listing?.user?.googleCalendarConnected) {
              const calendarTitle = setNames
                ? `${studioName} (${setNames}) - ${user?.name || "Customer"}`
                : `${studioName} booking by ${user?.name || "Customer"}`;
              afterCalendar = {
                ownerUserId: listing.user.id,
                title: calendarTitle,
                startIso: combineUtcIso(startDateYmd, startTime),
                endIso: combineUtcIso(startDateYmd, endTime),
              };
            }
            console.warn('[Webhook] Owner email prepared', { txnId: freshTxn.id, toEmail: listing.user.email });
          }
        } else {
          const resv = await db.reservation.findUnique({
            where: { id: freshTxn.reservationId },
            include: {
              listing: { include: { user: { include: { paymentDetails: true } } } },
              user: { select: { email: true, name: true, phone: true } },
            },
          });
          if (resv) {
            afterReservationId = resv.id;
            const studioName = resv.listing?.title || "";
            const actualLocation = resv.listing?.actualLocation as LocationData;
            const studioLocation = actualLocation?.display_name || "";
            const additionalInfo = actualLocation?.additionalInfo || "";
            const addonsStr = formatAddons(resv.selectedAddons);
            const totalPrice = Math.round(Number(resv.totalPrice || 0));
            const startDateYmd = resv.startDate?.toISOString().slice(0, 10) || "";
            afterTxnId = freshTxn.id;

            const ps = resv.pricingSnapshot as PricingSnapshotData | null;
            const setNames = [
              ps?.includedSetName,
              ...(ps?.additionalSets?.map((s) => s.name) || [])
            ].filter(Boolean).join(", ");
            const packageTitle = ps?.packageTitle || null;

            if (resv.user?.email) {
              afterCustomer = {
                toEmail: resv.user.email,
                toName: resv.user.name || "",
                studioName,
                startDate: startDateYmd,
                startTime: resv.startTime || "",
                endTime: resv.endTime || "",
                totalPrice,
                addons: addonsStr,
                studioLocation,
                additionalInfo,
                setNames,
                packageTitle,
              } as ExtendedCustomerEmailPayload;
              console.warn('[Webhook] Customer email prepared (existing reservation)', { txnId: freshTxn.id, toEmail: resv.user.email });
            }
            if (resv.listing?.user?.email) {
              afterOwner = {
                toEmail: resv.listing.user.email,
                toName: resv.listing.user.name || "",
                studioName,
                startDate: startDateYmd,
                startTime: resv.startTime || "",
                endTime: resv.endTime || "",
                totalPrice,
                customerName: resv.user?.name || "",
                templateId: process.env.MS_TPL_RESERVATION_OWNER || "",
                setNames,
                packageTitle,
              } as ExtendedOwnerEmailPayload;
              afterOwner.bookingId = resv.id;
              afterOwner.addons = addonsStr;
              afterOwner.formattedStartDate = startDateYmd;
              afterOwner.formattedStartTime = resv.startTime || "";
              afterOwner.formattedEndTime = resv.endTime || "";
              if (resv.listing?.user?.googleCalendarConnected) {
                const calendarTitle = setNames
                  ? `${studioName} (${setNames}) - ${resv.user?.name || "Customer"}`
                  : `${studioName} booking by ${resv.user?.name || "Customer"}`;
                afterCalendar = {
                  ownerUserId: resv.listing.user.id,
                  title: calendarTitle,
                  startIso: combineUtcIso(startDateYmd, resv.startTime || "00:00"),
                  endIso: combineUtcIso(startDateYmd, resv.endTime || "00:00"),
                };
              }
              console.warn('[Webhook] Owner email prepared (existing reservation)', { txnId: freshTxn.id, toEmail: resv.listing.user.email });
            }
          }
        }
      });

      if (afterTxnId && afterReservationId && txn.userId) {
        try {
          const invoiceResult = await ensureInvoiceWithAttachment({
            userId: txn.userId,
            reservationId: afterReservationId,
            transactionId: afterTxnId,
          });
          afterInvoiceAttachment = invoiceResult.attachment;
        } catch (e) {
          console.error("[Webhook] Invoice generation failed", { txnId: afterTxnId, error: (e instanceof Error ? e.message : String(e)) });
        }
      }

      if (afterInvoiceAttachment) {
        if (afterCustomer) {
          afterCustomer.attachments = [
            ...(afterCustomer.attachments || []),
            afterInvoiceAttachment,
          ];
        }
        if (afterOwner) {
          afterOwner.attachments = [
            ...(afterOwner.attachments || []),
            afterInvoiceAttachment,
          ];
        }
      }

      if (afterTxnId) {
        if (afterCustomer) {
          try {
            const before = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentCustomer: true } });
            await claimAndSendCustomerEmail(afterTxnId, afterCustomer);
            const after = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentCustomer: true } });
            console.warn('[Webhook] Customer email claim result', { txnId: afterTxnId, before: before?.emailSentCustomer, after: after?.emailSentCustomer });
          } catch (e) {
            console.error("[Webhook] Customer email dispatch error", { txnId: afterTxnId, error: (e instanceof Error ? e.message : String(e)) });
          }

          // Idempotent WhatsApp send — claim the flag before sending
          try {
            const claimed = await prisma.transaction.updateMany({
              where: { id: afterTxnId!, whatsappSentCustomer: false },
              data: { whatsappSentCustomer: true },
            });
            if (claimed.count === 1) {
              const txnUser = await prisma.user.findUnique({ where: { id: txn.userId! }, select: { phone: true } });
              const customerPhone = txnUser?.phone;
              if (customerPhone) {
                const locationLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afterCustomer.studioLocation || "")}`;

                // Check if the listing was fetched earlier to determine instant-booking
                const txnData = await prisma.transaction.findUnique({
                  where: { id: afterTxnId! },
                  select: { listing: { select: { instantBooking: true } } },
                });
                const isInstant = Boolean(txnData?.listing?.instantBooking);

                const dateParts = afterCustomer.startDate?.split("-") || [];
                const formattedDate = dateParts.length === 3 ? format(new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])), "dd MMM yyyy") : (afterCustomer.startDate || "");
                const formattedTime = afterCustomer.endTime ? `${afterCustomer.startTime} to ${afterCustomer.endTime}` : (afterCustomer.startTime || "");

                if (isInstant) {
                  await WhatsappService.sendBookingConfirmedCustomer(customerPhone, {
                    customerName: afterCustomer.toName || "",
                    listingTitle: afterCustomer.studioName || "",
                    startDate: formattedDate,
                    startTime: formattedTime,
                    locationLink,
                  });
                } else {
                  // Non-instant booking: acknowledge receipt, don't confirm yet
                  await WhatsappService.sendBookingReceivedCustomer(customerPhone, {
                    customerName: afterCustomer.toName || "",
                    listingTitle: afterCustomer.studioName || "",
                    startDate: formattedDate,
                    startTime: formattedTime,
                  });
                }
              }
            }
          } catch (e: unknown) {
            // Roll back the claim on failure so it can be retried
            await prisma.transaction.updateMany({
              where: { id: afterTxnId!, whatsappSentCustomer: true },
              data: { whatsappSentCustomer: false },
            }).catch(() => { });
            console.error("[Webhook] Customer WhatsApp dispatch error", {
              txnId: afterTxnId,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        if (afterOwner) {
          try {
            const before = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentOwner: true } });
            await claimAndSendOwnerEmail(afterTxnId, afterOwner);
            const after = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentOwner: true } });
            console.warn('[Webhook] Owner email claim result', { txnId: afterTxnId, before: before?.emailSentOwner, after: after?.emailSentOwner });
          } catch (e) {
            console.error("[Webhook] Owner email dispatch error", { txnId: afterTxnId, error: (e instanceof Error ? e.message : String(e)) });
          }

          // Idempotent WhatsApp send to host
          try {
            const claimed = await prisma.transaction.updateMany({
              where: { id: afterTxnId!, whatsappSentHost: false },
              data: { whatsappSentHost: true },
            });
            if (claimed.count === 1) {
              const txnListing = await prisma.transaction.findUnique({ where: { id: afterTxnId! }, select: { listing: { select: { user: { select: { phone: true } } } } } });
              const hostPhone = txnListing?.listing?.user?.phone;
              if (hostPhone) {
                const ownerExt = afterOwner as ExtendedOwnerEmailPayload;
                const dateParts = ownerExt.formattedStartDate?.split("-") || [];
                const formattedDate = dateParts.length === 3 ? format(new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])), "dd MMM yyyy") : (ownerExt.formattedStartDate || "");
                const formattedTime = ownerExt.formattedEndTime ? `${ownerExt.formattedStartTime} to ${ownerExt.formattedEndTime}` : (ownerExt.formattedStartTime || "");

                await WhatsappService.sendBookingReceivedHost(hostPhone, {
                  hostName: afterOwner.toName || "",
                  customerName: afterOwner.customerName || "",
                  listingTitle: afterOwner.studioName || "",
                  startDate: formattedDate,
                  startTime: formattedTime,
                });
              }
            }
          } catch (e: unknown) {
            // Roll back the claim on failure
            await prisma.transaction.updateMany({
              where: { id: afterTxnId!, whatsappSentHost: true },
              data: { whatsappSentHost: false },
            }).catch(() => { });
            console.error("[Webhook] Host WhatsApp dispatch error", {
              txnId: afterTxnId,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        if (afterCalendar) {
          try {
            await createCalendarEventForOwner(afterCalendar);
          } catch {
          }
        }
      }
    }

    if (status === "FAILED" && txn.userId) {
      const u = await prisma.user.findUnique({ where: { id: txn.userId }, select: { email: true, name: true } });
      if (u?.email) {
        try {
          await claimAndSendFailedEmail(txn.id, {
            toEmail: u.email,
            toName: u.name || "",
            templateId: process.env.MS_TPL_RESERVATION_FAILED || "",
            data: { customer_name: u.name || "", order_id: orderId },
          });
        } catch {
        }
      }
    }

    return { statusCode: 200 };
  } catch {
    return { statusCode: 200 };
  }
}
