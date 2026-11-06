import "server-only";

import Ably from "ably";

type RealtimeEvent = { channel: string; name: string; data: unknown };

export function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_CHAT_API?.trim();
  return key ? new Ably.Rest({ key }) : null;
}

export async function publishRealtime(events: RealtimeEvent[]) {
  const ably = getAblyRest();
  if (!ably) return;
  await Promise.allSettled(events.map(({ channel, name, data }) => ably.channels.get(channel).publish(name, data)));
}
