import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { getValidatedBaseUrl } from "@/lib/utils";
import { UserRole } from "@/types/user";

export const dynamic = "force-dynamic";

async function resolveTid(req: NextRequest): Promise<string> {
  const url = new URL(req.url);
  let tid = url.searchParams.get("tid") || url.searchParams.get("order_id") || "";

  if (!tid) {
    try {
      const declaredLength = Number(req.headers.get("content-length") || 0);
      if (Number.isFinite(declaredLength) && declaredLength > 10_000) return "";
      const text = await req.text();
      if (new TextEncoder().encode(text).byteLength > 10_000) return "";
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

  if (tid && /^[A-Za-z0-9_-]{1,100}$/.test(tid.trim())) {
    return tid.trim();
  }

  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      const latestTxn = await prisma.transaction.findFirst({
        where: {
          userId: currentUser.id,
          cfTxnRef: { not: null },
          status: { in: ["PENDING", "SUCCESS"] },
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
  const appUrl = getValidatedBaseUrl();
  const tid = await resolveTid(req);

  if (!tid) {
    const fallback = await getFallbackUrl();
    return NextResponse.redirect(new URL(fallback, appUrl), 303);
  }

  const redirectUrl = `${appUrl}/payments/cashfree/return?tid=${encodeURIComponent(tid)}`;
  return NextResponse.redirect(redirectUrl, 303);
}

export async function GET(req: NextRequest) {
  const appUrl = getValidatedBaseUrl();
  const tid = await resolveTid(req);

  if (!tid) {
    const fallback = await getFallbackUrl();
    return NextResponse.redirect(new URL(fallback, appUrl), 307);
  }

  const redirectUrl = `${appUrl}/payments/cashfree/return?tid=${encodeURIComponent(tid)}`;
  return NextResponse.redirect(redirectUrl, 307);
}
