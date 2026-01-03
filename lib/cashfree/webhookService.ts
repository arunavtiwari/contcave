import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
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
  [key: string]: unknown;
};

const MAX_SKEW_SEC = Number(process.env.WEBHOOK_MAX_SKEW_SEC || 600);
const OWNER_PAYOUT_PERCENT = Number(process.env.OWNER_PAYOUT_PERCENT || 80);

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
function mapStatus(s?: string) {
  const v = String(s || "").toUpperCase();
  if (v === "PAID" || v === "SUCCESS" || v === "CAPTURED") return "SUCCESS";
  if (v === "FAILED") return "FAILED";
  if (v === "CANCELLED") return "CANCELLED";
  if (v === "EXPIRED") return "EXPIRED";
  return "PENDING";
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
      // Send WhatsApp to Customer
      if (payload.toEmail) { // Using email as a proxy for user existence, but we need phone.
        // We need to fetch the user's phone. It's not in the payload.
        // We will handle this in the main flow where we have the user object.
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
    const status = mapStatus(pickPayStatus(body));
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
          select: { id: true, reservationId: true, userId: true, listingId: true, amount: true, metadata: true },
        });
        if (!freshTxn) return;

        if (!freshTxn.reservationId) {
          const [listing, user] = await Promise.all([
            db.listing.findUnique({
              where: { id: freshTxn.listingId! },
              include: { user: { include: { paymentDetails: true } } },
            }),
            db.user.findUnique({ where: { id: freshTxn.userId! }, select: { email: true, name: true, phone: true } }),
          ]);

          const md = (freshTxn.metadata || {}) as TransactionMetadata;
          const startDateYmd = String(md.startDate || "");
          const startDate = localMidnightFromYmd(startDateYmd);
          const startTime = String(md.startTime ?? "");
          const endTime = String(md.endTime ?? "");

          const reservation = await db.reservation.create({
            data: {
              userId: freshTxn.userId!,
              listingId: freshTxn.listingId!,
              startDate,
              startTime,
              endTime,
              totalPrice: freshTxn.amount,
              selectedAddons: md.selectedAddons ?? null,
              isApproved: (listing?.instantBooking ? 1 : 0),
              Transaction: { connect: { id: freshTxn.id } },
            },
            select: { id: true },
          });

          await db.transaction.update({
            where: { id: freshTxn.id },
            data: {
              reservationId: reservation.id,
              vendorId: listing?.user?.paymentDetails?.cashfreeVendorId || undefined,
              payoutPercentToOwner: OWNER_PAYOUT_PERCENT,
              payoutDueAt: startDate,
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
            };
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
            };
            const ownerEmailWithExtras = afterOwner as OwnerEmailPayload & Record<string, unknown>;
            ownerEmailWithExtras.bookingId = reservation.id;
            ownerEmailWithExtras.addons = addonsStr;
            ownerEmailWithExtras.formattedStartDate = startDateYmd;
            ownerEmailWithExtras.formattedStartTime = startTime;
            ownerEmailWithExtras.formattedEndTime = endTime;
            if (listing?.user?.googleCalendarConnected) {
              afterCalendar = {
                ownerUserId: listing.user.id,
                title: `${studioName} booking by ${user?.name || "Customer"}`,
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
              };
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
              };
              const ownerEmailWithExtras = afterOwner as OwnerEmailPayload & Record<string, unknown>;
              ownerEmailWithExtras.bookingId = resv.id;
              ownerEmailWithExtras.addons = addonsStr;
              ownerEmailWithExtras.formattedStartDate = startDateYmd;
              ownerEmailWithExtras.formattedStartTime = resv.startTime || "";
              ownerEmailWithExtras.formattedEndTime = resv.endTime || "";
              if (resv.listing?.user?.googleCalendarConnected) {
                afterCalendar = {
                  ownerUserId: resv.listing.user.id,
                  title: `${studioName} booking by ${resv.user?.name || "Customer"}`,
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

          let customerPhone: string | null | undefined;
          try {
            const txnUser = await prisma.user.findUnique({ where: { id: txn.userId! }, select: { phone: true } });
            customerPhone = txnUser?.phone;
            if (customerPhone) {
              await WhatsappService.sendBookingConfirmedCustomer(customerPhone, {
                customerName: afterCustomer.toName || "",
                listingTitle: afterCustomer.studioName || "",
                startDate: afterCustomer.startDate || "",
                startTime: afterCustomer.startTime || "",
                locationLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afterCustomer.studioLocation || "")}`
              });
            }
          } catch (e: unknown) {
            console.error("[Webhook] Customer WhatsApp dispatch error", {
              txnId: afterTxnId,
              error: e instanceof Error ? e.message : String(e),
              phone: customerPhone
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

          let hostPhone: string | null | undefined;
          try {
            const txnListing = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { listing: { select: { user: { select: { phone: true } } } } } });
            hostPhone = txnListing?.listing?.user?.phone;

            if (hostPhone) {
              await WhatsappService.sendBookingReceivedHost(hostPhone, {
                hostName: afterOwner.toName || "",
                customerName: afterOwner.customerName || "",
                listingTitle: afterOwner.studioName || "",
                startDate: (afterOwner as OwnerEmailPayload & { formattedStartDate?: string }).formattedStartDate || "",
                startTime: (afterOwner as OwnerEmailPayload & { formattedStartTime?: string }).formattedStartTime || ""
              });
            }
          } catch (e: unknown) {
            console.error("[Webhook] Host WhatsApp dispatch error", {
              txnId: afterTxnId,
              error: e instanceof Error ? e.message : String(e),
              hostPhone
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
