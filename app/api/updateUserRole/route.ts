import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
    try {
        // Get the authenticated user
        const currentUser = await getCurrentUser();

        // If the user is not authenticated, return a 401 response
        if (!currentUser) {
            return NextResponse.json(
                { error: "User not authenticated" },
                { status: 401 }
            );
        }

        // Parse the request body
        const { is_owner } = await request.json();

        // Ensure `is_owner` is provided in the request body
        if (typeof is_owner !== "boolean") {
            return NextResponse.json(
                { error: "Invalid or missing 'is_owner' field" },
                { status: 400 }
            );
        }

        // Update the user's role
        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id },
            data: { is_owner },
        });

        // Return the updated user object
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating user role:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
