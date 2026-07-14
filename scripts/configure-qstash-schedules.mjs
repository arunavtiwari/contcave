import { Client } from "@upstash/qstash";
import schedules from "../lib/cron/qstash-schedules.json" with { type: "json" };

const devMode = process.env.NODE_ENV !== "production"
  && (process.env.QSTASH_DEV === "true" || process.env.QSTASH_DEV === "1");
const token = process.env.QSTASH_TOKEN;
const destination = process.env.QSTASH_DESTINATION_URL
  || (devMode ? "http://localhost:3000/api/cron/qstash" : "https://contcave.com/api/cron/qstash");

if (!devMode && !token) {
  throw new Error("QSTASH_TOKEN is required");
}
const destinationUrl = new URL(destination);
if (!["http:", "https:"].includes(destinationUrl.protocol) || (!devMode && destinationUrl.protocol !== "https:")) {
  throw new Error("QSTASH_DESTINATION_URL must be a valid HTTPS URL outside development");
}

const client = devMode ? new Client({ devMode: true }) : new Client({ token });

for (const schedule of schedules) {
  const result = await client.schedules.create({
    destination,
    scheduleId: schedule.scheduleId,
    cron: schedule.cron,
    body: JSON.stringify({ job: schedule.job }),
    headers: { "Content-Type": "application/json" },
    retries: 5,
    label: "contcave-maintenance",
  });
  console.log(`Configured ${schedule.scheduleId}: ${result.scheduleId}`);
}
