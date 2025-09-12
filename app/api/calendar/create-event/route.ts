import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createCalendarEventForUser } from "@/lib/calendar/createEvent";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, start, end } = await request.json();

  if (!title || !start || !end) {
    return NextResponse.json(
      { error: 'Missing required fields: title, start, or end' },
      { status: 400 }
    );
  }

  try {
    const data = await createCalendarEventForUser({
      userId: String((session as any).user?.id || ""),
      title,
      startIso: String(start),
      endIso: String(end),
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
