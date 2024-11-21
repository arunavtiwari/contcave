import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser"; 

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const currentUser = await getCurrentUser(); 

        if (!currentUser) {
            return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
        }
        return NextResponse.json(currentUser);
    } catch (error) {
        console.error("Error fetching current user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
