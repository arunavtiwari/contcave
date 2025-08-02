import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {

  const body = await request.json();
  const {
    name,
  } = body;

  Object.keys(body).forEach((value: any) => {
    if (!body[value]) {
      NextResponse.error();
    }
  });

  const listen = await prisma.amenities.create({
    data: {
      name
    },
  });

  return NextResponse.json(listen);
}
export async function GET(request: Request) {

  const amenities: any[] = await prisma.amenities.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
  return NextResponse.json(amenities);
}
