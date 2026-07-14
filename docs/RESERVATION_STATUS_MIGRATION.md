# Reservation Status Cutover

`Reservation.status` is the source of truth for the booking lifecycle. `isApproved` remains only as a temporary compatibility field for old clients and integrations. The same idempotent cutover also labels transactions created before post-booking charges existed as `BASE_BOOKING`, so historical booking receipts and payouts remain linked correctly.

## Production Sequence

1. Take a MongoDB backup and confirm the deployment points at the intended database.
2. Run a non-mutating report:

```bash
npx tsx scripts/backfill-reservation-status.ts --dry-run
```

3. Review the target counts and resolve every row reported under `unresolvedIds`. The script deliberately does not guess a lifecycle status when a legacy reservation has neither an explicit enum nor a known `isApproved` value.
4. Execute the idempotent backfill:

```bash
npx tsx scripts/backfill-reservation-status.ts --execute
```

5. Verify the database has no unresolved lifecycle mismatches:

```bash
npx tsx scripts/backfill-reservation-status.ts --verify
```

The verification command must report `mismatched: 0`, `unresolved: 0`, and `transactionsWithoutPurpose: 0` before the compatibility cleanup release is deployed. Do not run `--execute` and `--verify` together. The script reads raw Mongo documents during the audit phase, so records that predate the required enum fields are safe to inspect before they are backfilled. Existing valid `Reservation.status` values are always preserved as the source of truth.

## Compatibility Removal

Keep the `isApproved` field and legacy numeric action adapters until all deployed clients and webhook/return-page workers use `Reservation.status`. After that cutover, remove them in a separate schema release with a rollback plan. The protected `/api/cron/*` endpoints may also be removed only after external callers are confirmed to use the signed QStash dispatcher.
