import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const body = await request.json();
    const { id, is_owner } = body;

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { is_owner: is_owner },
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.error();
    }
}
