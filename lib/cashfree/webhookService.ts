import prisma from "@/lib/prismadb";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
import { sendReservationCustomerEmail } from "@/lib/email/reservationCustomer";
import { sendReservationOwnerEmail } from "@/lib/email/reservationOwner";
import { sendTemplateEmail } from "@/lib/email/mailer";
import { createInvoice } from "@/lib/invoice/pdfBlob";

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

function fresh(tsHeader: string) {
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

function pickOrderId(p: any) {
  return String(p?.data?.order?.order_id ?? "");
}

function pickPayStatus(p: any) {
  return String(p?.data?.payment?.payment_status ?? "");
}

function pickPaymentId(p: any) {
  const r = p?.data?.payment?.cf_payment_id;
  return r != null ? String(r) : undefined;
}

function localMidnightFromYmd(ymd?: string): Date {
  return typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd)
    ? new Date(`${ymd}T00:00:00`)
    : new Date();
}

function formatAddons(a: any): string {
  const arr = Array.isArray(a) ? a : a && typeof a === "object" ? Object.values(a) : [];
  const parts = arr
    .map((x: any) => {
      const name = String(x?.name || "").trim();
      const qty = Number(x?.qty || 0);
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
  } catch (e) {
    console.error("Failed to create calendar event:", e);
  }
}

function combineUtcIso(ymd: string, hm: string): string {
  const time = /^(\d{2}):(\d{2})$/.test(hm) ? hm : "00:00";
  return new Date(`${ymd}T${time}:00Z`).toISOString();
}

async function claimAndSendCustomerEmail(
  txnId: string,
  payload: {
    toEmail: string;
    toName: string;
    studioName: string;
    startDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    addons: string;
    studioLocation: string;
  }
) {
  const claimed = await prisma.transaction.updateMany({
    where: { id: txnId, emailSentCustomer: false },
    data: { emailSentCustomer: true },
  });
  if (claimed.count === 1) {
    try {
      await sendReservationCustomerEmail(payload);
    } catch (e) {
      await prisma.transaction.update({ where: { id: txnId }, data: { emailSentCustomer: false } });
      throw e;
    }
  }
}

async function claimAndSendOwnerEmail(
  txnId: string,
  payload: {
    toEmail: string;
    toName: string;
    studioName: string;
    startDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    customerName: string;
    templateId?: string;
    bookingId?: string;
    addons?: string;
    formattedStartDate?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
  }
) {
  if (!payload?.toEmail) return;
  const tpl = payload.templateId || process.env.MS_TPL_RESERVATION_OWNER;
  if (!tpl) return;

  const claimed = await prisma.transaction.updateMany({
    where: { id: txnId, emailSentOwner: false },
    data: { emailSentOwner: true },
  });
  if (claimed.count === 1) {
    try {
      await sendReservationOwnerEmail(payload as any);
    } catch (e) {
      await prisma.transaction.update({ where: { id: txnId }, data: { emailSentOwner: false } });
      throw e;
    }
  }
}

async function claimAndSendFailedEmail(
  txnId: string,
  payload: { toEmail: string; toName: string; templateId: string; data: Record<string, any> }
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
        cfVerifyWebhookSignature({
          rawBody: raw,
          timestamp: headers.timestamp,
          signatureBase64: headers.signature,
        });
      if (!okSig || !fresh(headers.timestamp)) return { statusCode: 401 };
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return { statusCode: 200 };
    }

    const orderId = pickOrderId(body);
    if (!orderId) return { statusCode: 200 };

    const status = mapStatus(pickPayStatus(body));
    const cfPaymentId = pickPaymentId(body);

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
        data: { status, cfPaymentId, cfWebhookPayload: body, cfSignature: headers.signature || undefined },
      });
    }

    let afterCustomer: Parameters<typeof claimAndSendCustomerEmail>[1] | undefined;
    let afterOwner: Parameters<typeof claimAndSendOwnerEmail>[1] | undefined;
    let afterTxnId: string | undefined;
    let afterCalendar: OwnerCalendarPayload | undefined;

    if (status === "SUCCESS" && txn.userId && txn.listingId) {
      // DB transaction for reservation + transaction update
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
            db.user.findUnique({ where: { id: freshTxn.userId! }, select: { email: true, name: true } }),
          ]);

          const md: any = freshTxn.metadata || {};
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
              isApproved: (listing?.instantBooking ? 1 : 0) as any,
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

          // Prepare email & calendar payloads
          const studioName = listing?.title || "";
          const studioLocation = listing?.locationValue || "";
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
            };
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
              bookingId: reservation.id,
              addons: addonsStr,
              formattedStartDate: startDateYmd,
              formattedStartTime: startTime,
              formattedEndTime: endTime,
            };
            if (listing?.user?.googleCalendarConnected) {
              afterCalendar = {
                ownerUserId: listing.user.id,
                title: `${studioName} booking by ${user?.name || "Customer"}`,
                startIso: combineUtcIso(startDateYmd, startTime),
                endIso: combineUtcIso(startDateYmd, endTime),
              };
            }
          }
        }
      });

      // After DB commit: generate invoice safely
      if (afterTxnId) {
        try {
          const txnRecord = await prisma.transaction.findUnique({ where: { id: afterTxnId } });
          if (txnRecord?.reservationId && txnRecord.userId) {
            await createInvoice({
              userId: txnRecord.userId,
              reservationId: txnRecord.reservationId,
              transactionId: txnRecord.id,
              amount: txnRecord.amount,
            });
          }
        } catch (e) {
          console.error("Invoice generation failed", e);
        }

        // Send customer email
        if (afterCustomer) {
          try {
            await claimAndSendCustomerEmail(afterTxnId, afterCustomer);
          } catch (e) {
            console.error("Customer email failed", e);
          }
        }

        // Send owner email
        if (afterOwner) {
          try {
            await claimAndSendOwnerEmail(afterTxnId, afterOwner);
          } catch (e) {
            console.error("Owner email failed", e);
          }
        }

        // Create calendar event
        if (afterCalendar) {
          try {
            await createCalendarEventForOwner(afterCalendar);
          } catch (e) {
            console.error("Calendar event creation failed", e);
          }
        }
      }
    }

    // Handle failed transactions
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
          console.error("Failed transaction email failed");
        }
      }
    }

    return { statusCode: 200 };
  } catch (e) {
    console.error("Unhandled webhook error:", e);
    return { statusCode: 200 };
  }
}
