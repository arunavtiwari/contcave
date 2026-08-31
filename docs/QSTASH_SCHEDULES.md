# QStash Maintenance Schedules

Official reference: https://upstash.com/docs/qstash/features/schedules

ContCave uses Upstash QStash for time-sensitive background work. Booking creation, host approval, check-in, and paid extensions publish one-off messages for their exact due times. QStash signs each delivery and retries failed deliveries. The recurring schedules below are reconciliation backstops, not the primary timers. The route handler remains idempotent so an at-least-once delivery cannot double-complete a booking or payout.

Required production variables:

- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `QSTASH_DESTINATION_URL` (optional; defaults to `https://contcave.com/api/cron/qstash`)

Workers rely on existing terminal business states and delivery flags rather than a process/deployment timestamp. Before enabling production schedules for the first time, choose an explicit boundary and run the reusable cleanup in this order:

```bash
npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z
npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z --execute
npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z --verify
```

The first command is a dry run. The execute step is idempotent and closes only records that are still in the listed actionable states; it does not rewrite already-terminal records. Keep the same exact boundary for all three commands.

## Local QStash

For local development, run the Next.js app on port 3000 and start the local QStash server:

```bash
npm run qstash:dev
```

Copy the local credentials printed by QStash into `.env.local` and set the local destination:

```dotenv
QSTASH_DEV=true
QSTASH_URL=http://localhost:8080
QSTASH_DESTINATION_URL=http://localhost:3000/api/cron/qstash
QSTASH_TOKEN=<local-token>
QSTASH_CURRENT_SIGNING_KEY=<local-current-signing-key>
QSTASH_NEXT_SIGNING_KEY=<local-next-signing-key>
```

Then configure local recurring schedules with `npm run configure:qstash`. Local QStash data is in-memory and is reset when the local server restarts; it is for development/testing only. The local Console connection uses `http://localhost:8080`.

After deployment, configure or update all schedules with:

```bash
npm run configure:qstash
```

The recurring schedule definitions live in `lib/cron/qstash-schedules.json`. They use UTC expressions for compatibility with local and hosted QStash; the application applies the Asia/Kolkata month-end guard where calendar-day boundaries matter. Do not add GitHub Actions cron workflows for these jobs, because that would run maintenance twice.

The worker implementations live under `lib/maintenance`. Production scheduling is performed through the signed `/api/cron/qstash` dispatcher.
