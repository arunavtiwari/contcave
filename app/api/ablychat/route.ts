import { NextResponse } from "next/server";
import Ably from "ably";
import getCurrentUser from "@/app/actions/getCurrentUser";
export const dynamic = "force-dynamic"
export async function POST(request: Request) {
  // Get the current user
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create a new Ably client instance with your API key
  const client = new Ably.Realtime({
    key: "mqScEw.KR_mtA:hXN4SyJS62x5aW_oF3ZUL5QpkxzgpYltXFl1jmtJfMc",
  });

  try {
    // Generate a token request for the current user
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: currentUser.id,
    });

    // Return the token request as a JSON response
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Error generating Ably token:", error);
    return NextResponse.json({ error: "Error generating token" }, { status: 500 });
  }
}
