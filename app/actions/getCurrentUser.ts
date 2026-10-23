import { cache } from "react";

import { auth } from "@/auth";
import { UserService } from "@/lib/user/service";

export async function getSession() {
  return await auth();
}

/**
 * Memoised per request: the admin layout, the page and the server action behind it all
 * need the current user, and without this each one pays for a fresh session decode plus
 * a `user.findUnique` round trip.
 */
const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session?.user?.email) return null;

    const user = await UserService.findByEmail(session.user.email);
    if (!user) return null;

    if (user.markedForDeletion) {
      return null;
    }

    return UserService.serializeUser(user);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw error;
    }
    console.error('[getCurrentUser] Error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
});

export default getCurrentUser;

