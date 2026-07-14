/**
 * Automatic delivery jobs must be explicitly activated after a release. This
 * prevents a new scheduler or retry worker from contacting recipients for
 * historical records when it first runs against production.
 */
export function getAutomatedNotificationStart(): Date | null {
  const value = process.env.NOTIFICATION_AUTOMATION_START_AT;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("NOTIFICATION_AUTOMATION_START_AT must be a valid ISO-8601 timestamp.");
  }
  return date;
}
