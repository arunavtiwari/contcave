import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({
        canReview: false,
        message: "User not authenticated"
      }, { status: 401 });
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json({
        error: "Invalid Listing ID",
      }, { status: 400 });
    }

    const reservationCount = await prisma.reservation.count({
      where: {
        listingId,
        userId: currentUser.id,
      },
    });

    if (reservationCount === 0) {
      return NextResponse.json({
        canReview: false,
        message: "No reservations found for this user and listing"
      });
    }

    const latestReservation = await prisma.reservation.findFirst({
      where: {
        listingId,
        userId: currentUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        startDate: true,
        startTime: true,
        endTime: true,
      }
    });

    if (!latestReservation) {
      return NextResponse.json({
        canReview: false,
        message: "No reservation found",
      }, { status: 404 });
    }

    // Determine if the reservation has concluded (end datetime <= now)
    const ymd = latestReservation.startDate.toISOString().slice(0, 10);
    const parseHm = (label?: string | null): { h: number, m: number } | null => {
      if (!label) return null;
      const s = String(label);
      const m12 = s.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
      const m24 = s.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
      if (m12) {
        let hh = parseInt(m12[1], 10);
        const mm = parseInt(m12[2], 10);
        const ap = m12[3].toUpperCase();
        if (ap === 'PM' && hh < 12) hh += 12;
        if (ap === 'AM' && hh === 12) hh = 0;
        return { h: hh, m: mm };
      }
      if (m24) {
        return { h: parseInt(m24[1], 10), m: parseInt(m24[2], 10) };
      }
      return null;
    };
    const hmStart = parseHm(latestReservation.startTime || undefined);
    const hmEnd = parseHm(latestReservation.endTime || undefined);
    let endAt: Date;
    if (hmEnd) {
      endAt = new Date(`${ymd}T${String(hmEnd.h).padStart(2, '0')}:${String(hmEnd.m).padStart(2, '0')}:00`);
    } else if (hmStart) {
      endAt = new Date(`${ymd}T${String(hmStart.h).padStart(2, '0')}:${String(hmStart.m).padStart(2, '0')}:00`);
    } else {
      endAt = new Date(`${ymd}T23:59:00`);
    }
    const now = new Date();

    const todayYmd = new Date().toISOString().slice(0, 10);
    const isPastDay = ymd < todayYmd;
    const canReviewNow = isPastDay || endAt.getTime() <= now.getTime();

    return NextResponse.json({
      message: 'Reservation found',
      canReview: canReviewNow,
      latestReservationId: latestReservation.id,
      endAt: endAt.toISOString(),
      now: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in fetching reservation:", error);
    return NextResponse.json({
      error: "Internal Server Error",
    }, { status: 500 });
  }
}