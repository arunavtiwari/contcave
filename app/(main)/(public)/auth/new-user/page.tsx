import { redirect } from "next/navigation";

import { auth } from "@/auth";
import GoogleSignupComplete from "@/components/analytics/GoogleSignupComplete";

type SearchParams = Promise<{ callbackUrl?: string | string[] }>;

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [session, query] = await Promise.all([auth(), searchParams]);
  if (!session?.user) redirect("/");

  const callbackUrl = Array.isArray(query.callbackUrl)
    ? query.callbackUrl[0]
    : query.callbackUrl;

  return (
    <GoogleSignupComplete
      callbackUrl={callbackUrl ?? "/"}
      eventCreatedAt={session.signupEventCreatedAt ?? null}
      eventId={session.signupEventId ?? null}
    />
  );
}
