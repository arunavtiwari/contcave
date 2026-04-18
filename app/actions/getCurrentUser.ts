import { auth } from "@/auth";
import { UserService } from "@/lib/user/service";

export const dynamic = "force-dynamic";

export async function getSession() {
  return await auth();
}

export default async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session?.user?.email) return null;

    let user = await UserService.findByEmail(session.user.email);
    if (!user) return null;

    if (user.markedForDeletion) {
      user = await UserService.restoreProfile(user.id);
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
}
