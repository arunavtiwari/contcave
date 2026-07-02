import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { UserRole } from "@/types/user";

export const dynamic = "force-dynamic";

async function resolveTid(req: NextRequest): Promise<string> {
  const url = new URL(req.url);
  let tid = url.searchParams.get("tid") || url.searchParams.get("order_id") || "";

  if (!tid) {
    try {
      const text = await req.text();
      if (text) {
        try {
          const body = JSON.parse(text);
          tid = body.orderId || body.order_id || body.cf_order_id || body.transaction_id || body.tid || "";
        } catch {
          const params = new URLSearchParams(text);
          tid = params.get("orderId") || params.get("order_id") || params.get("cf_order_id") || params.get("transaction_id") || params.get("tid") || "";
        }
      }
    } catch (e) {
      console.error("[CashfreeReturnRedirect] Error parsing request body text:", e);
    }
  }

  if (tid) {
    return tid.trim();
  }

  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      const latestTxn = await prisma.transaction.findFirst({
        where: {
          userId: currentUser.id,
          createdAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (latestTxn?.cfTxnRef) {
        return latestTxn.cfTxnRef;
      }
    }
  } catch (dbError) {
    console.error("[CashfreeReturnRedirect] Database lookup failed:", dbError);
  }

  return "";
}

async function getFallbackUrl(): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.ADMIN) {
        return "/dashboard/reservations";
      }
      return "/dashboard/bookings";
    }
  } catch (e) {
    console.error("[CashfreeReturnRedirect] Fallback URL resolution failed:", e);
  }
  return "/";
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const tid = await resolveTid(req);

  if (!tid) {
    const fallback = await getFallbackUrl();
    return NextResponse.redirect(new URL(fallback, url.origin), 303);
  }

  const redirectUrl = `${url.origin}/payments/cashfree/return?tid=${encodeURIComponent(tid)}`;
  return NextResponse.redirect(redirectUrl, 303);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tid = await resolveTid(req);

  if (!tid) {
    const fallback = await getFallbackUrl();
    return NextResponse.redirect(new URL(fallback, url.origin), 307);
  }

  const redirectUrl = `${url.origin}/payments/cashfree/return?tid=${encodeURIComponent(tid)}`;
  return NextResponse.redirect(redirectUrl, 307);
}
