import prisma from "@/lib/prismadb";
import { ensureCalendarEventForUser, createCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
import { sendReservationCustomerEmail } from "@/lib/email/reservationCustomer";
import { sendReservationOwnerEmail } from "@/lib/email/reservationOwner";
import { sendTemplateEmail } from "@/lib/email/mailer";

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
    return typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(`${ymd}T00:00:00`) : new Date();
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
    } catch {
    }
}

function combineUtcIso(ymd: string, hm: string): string {
    const time = /^(\d{2}):(\d{2})$/.test(hm) ? hm : "00:00";
    return new Date(`${ymd}T${time}:00Z`).toISOString();
}

// atomic email claimers (never run inside a DB transaction)
async function claimAndSendCustomerEmail(
    txnId: string,
    payload: {
        toEmail: string; toName: string; studioName: string; startDate: string;
        startTime: string; endTime: string; totalPrice: number; addons: string; studioLocation: string;
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
        toEmail: string; toName: string; studioName: string; startDate: string;
        startTime: string; endTime: string; totalPrice: number; customerName: string; templateId?: string;
    }
) {
    if (!payload?.toEmail) {
        console.warn("Owner email skipped: missing recipient", { txnId });
        return;
    }
    const tpl = (payload as any)?.templateId || process.env.MS_TPL_RESERVATION_OWNER;
    if (!tpl) {
        console.warn("Owner email skipped: missing templateId", { txnId });
        return;
    }
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
                cfVerifyWebhookSignature({ rawBody: raw, timestamp: headers.timestamp, signatureBase64: headers.signature });
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
        // basic trace
        console.log("Webhook parsed", { orderId, status });
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

                    // prepare emails only (do not send here)
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
                        console.log("Prepared customer email", { txnId: freshTxn.id, to: user.email });
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
                        } as any;
                        // enrich with extra fields expected by new owner template
                        (afterOwner as any).bookingId = reservation.id;
                        (afterOwner as any).addons = addonsStr;
                        (afterOwner as any).formattedStartDate = startDateYmd;
                        (afterOwner as any).formattedStartTime = startTime;
                        (afterOwner as any).formattedEndTime = endTime;
                        if (listing?.user?.googleCalendarConnected) {
                            afterCalendar = {
                                ownerUserId: listing.user.id,
                                title: `${studioName} booking by ${user?.name || "Customer"}`,
                                startIso: combineUtcIso(startDateYmd, startTime),
                                endIso: combineUtcIso(startDateYmd, endTime),
                            };
                        }
                        console.log("Prepared owner email", { txnId: freshTxn.id, to: listing.user.email });
                    }
                } else {
                    // reservation already exists → load for email payloads
                    const resv = await db.reservation.findUnique({
                        where: { id: freshTxn.reservationId },
                        include: {
                            listing: { include: { user: { include: { paymentDetails: true } } } },
                            user: { select: { email: true, name: true } },
                        },
                    });
                    if (resv) {
                        const studioName = resv.listing?.title || "";
                        const studioLocation = resv.listing?.locationValue || "";
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
                            };
                            console.log("Prepared customer email (existing)", { txnId: freshTxn.id, to: resv.user.email });
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
                            } as any;
                            (afterOwner as any).bookingId = resv.id;
                            (afterOwner as any).addons = addonsStr;
                            (afterOwner as any).formattedStartDate = startDateYmd;
                            (afterOwner as any).formattedStartTime = resv.startTime || "";
                            (afterOwner as any).formattedEndTime = resv.endTime || "";
                            if (resv.listing?.user?.googleCalendarConnected) {
                                afterCalendar = {
                                    ownerUserId: resv.listing.user.id,
                                    title: `${studioName} booking by ${resv.user?.name || "Customer"}`,
                                    startIso: combineUtcIso(startDateYmd, resv.startTime || "00:00"),
                                    endIso: combineUtcIso(startDateYmd, resv.endTime || "00:00"),
                                };
                            }
                            console.log("Prepared owner email (existing)", { txnId: freshTxn.id, to: resv.listing.user.email });
                        }
                    }
                }
            });

            // send emails after commit using atomic claim flags
            if (afterTxnId) {
                if (afterCustomer) {
                    try {
                        const before = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentCustomer: true } });
                        await claimAndSendCustomerEmail(afterTxnId, afterCustomer);
                        const after = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentCustomer: true } });
                        console.log("Customer email claim", { txnId: afterTxnId, before: before?.emailSentCustomer, after: after?.emailSentCustomer });
                    } catch (e) {
                        console.error("Customer email dispatch error", { txnId: afterTxnId, error: (e as any)?.message || e });
                    }
                }
                if (afterOwner) {
                    try {
                        const before = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentOwner: true } });
                        await claimAndSendOwnerEmail(afterTxnId, afterOwner);
                        const after = await prisma.transaction.findUnique({ where: { id: afterTxnId }, select: { emailSentOwner: true } });
                        console.log("Owner email claim", { txnId: afterTxnId, before: before?.emailSentOwner, after: after?.emailSentOwner });
                    } catch (e) {
                        console.error("Owner email dispatch error", { txnId: afterTxnId, error: (e as any)?.message || e });
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
