import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {

  const body = await request.json();
  const {
    name,
    price,
    image,
  } = body;

  Object.keys(body).forEach((value: any) => {
    if (!body[value]) {
      NextResponse.error();
    }
  });

  const listen = await prisma.addons.create({
    data: {
      name,
      price,
      image
    },
  });

  return NextResponse.json(listen);
}
