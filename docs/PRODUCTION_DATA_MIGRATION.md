# Production Data Migration

`scripts/migrate-production-data.ts` is the single, idempotent production cutover for data introduced by the booking, listing-archive, per-user reservation visibility, and private-document changes.

It performs all of the following:

- backfills `Reservation.status` without replacing an existing valid lifecycle state;
- keeps the temporary `isApproved` compatibility value aligned with the lifecycle state;
- labels legacy transactions as `BASE_BOOKING`;
- initializes missing listing archive and reservation visibility fields, plus the required review-reminder attempt counter;
- deactivates listings belonging to accounts that were already deactivated before listing restoration tracking existed;
- seeds the existing 14-item default amenity catalog as admin-managed database records, remaps every listing to those canonical IDs, and moves previously owner-created global amenities into `Listing.otherAmenities` only on the listings that had selected them;
- deletes the two confirmed orphan test custom-amenity rows (`Test` and `Test 2`) only when their IDs, owner ID, and names all match, while reporting any other unlinked legacy custom amenities for explicit handling;
- constrains legacy minimum booking durations to each listing's same-day operating window and disables active packages that cannot fit inside that window, retaining those package records for owner review;
- reconciles exact duplicate default amenities, billing profiles, and per-reservation reviews before their unique indexes are created, preserving listing references and financial document relationships;
- moves publicly stored listing verification files, agreements, invoices, and vouchers into the private R2 bucket and replaces database URLs with `r2-private://` references.

## Production sequence

1. Take a MongoDB backup and confirm that `DATABASE_URL` points to the intended database.
2. Configure `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME` and the existing public/private R2 credentials. Ensure the application and migration identity can read/delete from the public bucket and read/write from the private bucket. The private bucket must not have a public custom domain, `r2.dev` exposure, or any other unauthenticated read binding.
3. Start a maintenance window before the first dry run: drain booking/listing/payment writes, pause application workers and schedulers, and freeze administrator amenity changes. Keep that write freeze until verification succeeds. This is required because the one-time amenity conversion cannot distinguish a historical owner-created global row from a new administrator row created during the cutover.
4. Install the complete release dependencies (including development dependencies while this migration exists) and regenerate Prisma Client from the new schema, but do not apply the new database indexes yet. `migrate:data` uses the development dependency `tsx` and therefore is not available in an `--omit=dev` install.
5. Run the non-mutating report against production. `environmentIssues` must be empty; execution and verification stop before any database or object-storage mutation when required R2 configuration is missing, malformed, or points the public and private roles at the same bucket:

```bash
npm run migrate:data -- --dry-run
```

6. Resolve every lifecycle `unresolvedIds`, `amenityCatalog.danglingIds`, and `legacyCustomAmenities.unresolvedIds` entry before execution. The migration deliberately refuses to guess when a legacy reservation has neither a valid status nor a recognized `isApproved` value, when a missing amenity ObjectId has no recoverable name, or when an unlinked user-level custom amenity has not been explicitly classified. The two confirmed test rows appear under `confirmedTestRowsToDelete` and are removed automatically during execution.
7. Execute the migration:

```bash
npm run migrate:data -- --execute
```

8. Re-run execution if an R2 operation failed. Already migrated rows and objects are safe to process again. A concurrent-listing warning during this maintenance window means an unpaused writer still exists and must be drained before retrying. Review the reported duplicate IDs against the database backup; duplicate reviews keep the earliest review and duplicate billing records are repointed to the earliest record. Amenity migration preserves all known defaults by canonical ID and preserves legacy owner-created global amenity names only on listings that actually referenced them. Dangling unknown amenity IDs are reported and removed from listing selections because no recoverable display name exists. Review `bookingDurations.packageIds` with owners; those packages remain stored but inactive because their durations cannot fit the listing's one-day operating window.
9. Apply the Prisma schema/indexes with the deployment's normal MongoDB schema process. The unique indexes are applied only after duplicate reconciliation.
10. Deploy the new application version while maintenance mode remains active. Do not route traffic to the previous application version after the status backfill: the legacy numeric field cannot express every new terminal lifecycle state, even though it remains synchronized for rollback/read compatibility.
11. Verify that no work remains:

```bash
npm run migrate:data -- --verify
```

Verification succeeds only when lifecycle mismatches, unresolved reservations, legacy transaction purposes, missing compatibility fields, legacy deactivated listings, amenity catalog/remapping work, legacy custom-amenity cleanup, invalid booking durations, duplicate unique-index keys, public or unsupported sensitive-document references, missing/inaccessible private objects, and migration failures are all zero. Verification performs read-only metadata checks against every private document reference. Unsupported document hosts are reported for manual recovery instead of being fetched, which prevents the migration from becoming an arbitrary outbound URL fetcher.

12. Purge the legacy document paths from the public CDN, confirm the authenticated document routes work for the intended recipient/owner/administrator, then reopen application traffic and schedulers. Retire the migration command before administrators create any new default amenities; until it is retired, do not run `--execute` again after the amenity catalog is reopened for normal administration.

The optional `--batch-size=25` argument controls document-query batches (range `1` to `100`). Database updates use bounded batches, and private documents are copied before their public source objects are deleted. Database references are updated only after the private copy exists.

Deleting source R2 objects does not guarantee that previously cached public responses disappear immediately, which is why the CDN purge is a mandatory cutover step rather than optional cleanup.

The last-four-commit deployment also replaces legacy cron endpoints with the signed QStash dispatcher. After deploying the application, set `NOTIFICATION_AUTOMATION_START_AT` to the intentional production activation timestamp and run `npm run configure:qstash` once with the production QStash credentials. This is an external scheduler setup step, not a database mutation, so it is intentionally not performed by the data migration.

## Compatibility removal

Do not remove compatibility code in the same deployment as the data migration. First require a successful `--verify`, confirm the new application version and QStash schedules have run normally through the agreed monitoring window, retain the database/R2 backup, and then use a separate reversible cleanup release.

### Remove in the later cleanup release

1. Remove `Reservation.isApproved`, `statusFromLegacyApproval`, `legacyApprovalFromStatus`, and numeric reservation-action adapters only after access logs and deployed-client inventory confirm that every UI, Cashfree return/webhook path, administrator action, and background worker reads/writes `Reservation.status`. Re-run migration verification immediately before the schema removal.
2. Once every sensitive database reference begins with `r2-private://`, remove the legacy public-URL branches (`url`/`pdfUrl`) from verification normalizers, stored legacy types, document readers, and the lazy public-to-private copy path. Keep the authenticated invoice, voucher, verification, and agreement download routes. Purge the old CDN paths before removing compatibility reads.
3. Remove `scripts/migrate-production-data.ts`, the `migrate:data` package command, and the `tsx` development dependency only after production verification, CDN purge, and the rollback window are complete. Keep this document or the deployment record as an audit trail.
4. The `CustomAmenities` Prisma model is not used by the current listing flow; owner custom values live in `Listing.otherAmenities`. The migration output reports `legacyCustomAmenities` and removes only the two explicitly confirmed test rows. Keep the `CustomAmenities` collection/model and the `User.CustomAmenities` relation while `total` or `unresolved` remains non-zero after verification. Do not copy any other record to listings without an explicit product-data decision because the legacy model contains no listing ID.
5. Remove obsolete external GitHub cron schedules/secrets only after every expected QStash schedule ID is visible and signed deliveries are succeeding. Keep the signed `/api/cron/qstash` route, QStash credentials, schedule definitions, and `NOTIFICATION_AUTOMATION_START_AT`; they are the active system, not legacy code.

### Retain

- Retain `Reservation.markedForDeletion` and `markedForDeletionAt` for historical globally hidden reservations. Old records do not identify whether the guest or owner initiated deletion, so they cannot be safely converted into one of the new per-user timestamps. New actions use `hiddenByGuestAt`/`hiddenByOwnerAt`.
- Retain user `markedForDeletion`/`markedForDeletionAt` and listing `accountDeactivatedAt`; they implement the intentionally reversible account-deactivation behavior.
- Retain `CASHFREE_API_VERSION` with the current `2023-08-01` default unless a separately reviewed Cashfree API upgrade is performed. Do not add new payout-onboarding identity fields without reviewing that API contract and the product flow.
- Retain the existing `CASHFREE_VERIFY_VENDOR_ACCOUNT`-controlled penny-drop behavior. Email, phone, Aadhaar, and bank-data gates remain required before payout onboarding; validated GSTIN is included only when the owner has supplied it.
- Retain the 14 seeded `Amenities` rows as the initial admin-managed default catalog and retain every listing's `otherAmenities` values as owner-managed, listing-specific data. The migration does not overwrite a seeded row that already exists, so later administrator name/icon edits remain authoritative.
