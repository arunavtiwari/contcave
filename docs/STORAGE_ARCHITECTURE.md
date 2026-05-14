# Storage Architecture and Folder Convention (Cloudflare R2)

ContCave stores uploaded and generated assets in Cloudflare R2 using the S3 API. The canonical structure is owner-isolated and listing-scoped so assets can be audited, exported, and deleted without ambiguous ownership.

## Canonical Hierarchy

Every application-owned object must live under `users/{userId}/`.

```text
users/
  {userId}/
    profiles/
      {assetId}.{jpg|jpeg|png|webp}

    listings/
      {listingId}/
        media/
          main/
            {assetId}.{jpg|jpeg|png|webp}
          videos/
            {assetId}.{mp4|webm|mov}
          sets/
            {setId}/
              {assetId}.{jpg|jpeg|png|webp}

        addons/
          {addonId}/
            {assetId}.{jpg|jpeg|png|webp}

        compliance/
          verification/
            {documentType}/
              {assetId}.{pdf|jpg|jpeg|png|webp}
          agreements/
            {agreementId}/
              signed.pdf

    billing/
      invoices/
        {invoiceId}/
          invoice.pdf

static/
  {assetName}
```

## Current Implemented Paths

| Asset | Canonical R2 key |
| --- | --- |
| Profile image | `users/{userId}/profiles/{assetId}.{ext}` |
| Listing gallery image | `users/{ownerId}/listings/{listingId}/media/main/{assetId}.{ext}` |
| Listing video | `users/{ownerId}/listings/{listingId}/media/videos/{assetId}.{ext}` |
| Listing set image | `users/{ownerId}/listings/{listingId}/media/sets/{setId}/{assetId}.{ext}` |
| Add-on thumbnail | `users/{ownerId}/listings/{listingId}/addons/{addonId}/{assetId}.{ext}` |
| Verification document | `users/{ownerId}/listings/{listingId}/compliance/verification/{documentType}/{assetId}.{ext}` |
| Signed agreement PDF | `users/{ownerId}/listings/{listingId}/compliance/agreements/{agreementId}/signed.pdf` |
| Invoice PDF | `users/{userId}/billing/invoices/{invoiceId}/invoice.pdf` |
| Static public asset | `static/{assetName}` |

## Ownership Rules

1. User-level assets, such as profile images, are stored directly under `users/{userId}`.
2. Listing media, add-ons, verification documents, and signed terms PDFs are owned by the listing owner and stored under `users/{ownerId}/listings/{listingId}`.
3. Customer billing documents are owned by the billed user and stored under `users/{userId}/billing`.
4. New object keys must never use root-level `verifications/`, root-level `agreements/`, `migrated/cloudinary/`, `listing_main`, `listing_sets`, `listing_videos`, or `users/{userId}/invoices`.

## Upload Strategy

### Client-selected files

Images, videos, add-on thumbnails, and verification documents use presigned URLs from `app/api/upload/presign/route.ts`.

The API always prefixes the requested folder with the authenticated user namespace:

```text
users/{currentUser.id}/{folder}/{randomAssetId}.{ext}
```

Callers must pass canonical folders without a leading `users/{userId}` segment, for example:

```text
listings/{listingId}/media/main
listings/{listingId}/media/videos
listings/{listingId}/media/sets/{setId}
listings/{listingId}/addons/{addonId}
listings/{listingId}/compliance/verification/general
profiles
```

### Server-generated PDFs

Generated PDFs are written directly to R2 from the server:

```text
users/{ownerId}/listings/{listingId}/compliance/agreements/{agreementId}/signed.pdf
users/{userId}/billing/invoices/{invoiceId}/invoice.pdf
```

## Cleanup and Migration

The canonicalization script is:

```bash
node scripts/canonicalize-r2-storage.js
```

Dry-run mode reports stale DB references and planned object moves. Apply mode copies objects to canonical keys, verifies the target objects, updates MongoDB, and writes backups:

```bash
node scripts/canonicalize-r2-storage.js --apply
```

Cleanup mode additionally deletes obsolete source objects, but only after the DB verification step reports zero stale references:

```bash
node scripts/canonicalize-r2-storage.js --apply --cleanup
```

The same canonicalizer also audits Cloudinary references and fails if any remain.

## Post-Migration State

As of the canonical storage migration on 2026-05-14:

- Cloudinary DB references: `0`
- Generic `migrated/cloudinary` DB references: `0`
- Root-level `verifications/` DB references: `0`
- Root-level `agreements/` DB references: `0`
- Old flat `users/{userId}/invoices` DB references: `0`

Final rollback backups and URL maps are stored in `dump/cloudinary-r2-migration/`.

## Security Properties

1. Tenant isolation: presigned uploads are scoped to `users/{currentUser.id}`.
2. Listing isolation: listing-owned assets are grouped under `users/{ownerId}/listings/{listingId}`.
3. Erasure support: deleting a user can recursively remove `users/{userId}/`.
4. Listing cleanup: deleting a listing can recursively remove `users/{ownerId}/listings/{listingId}/`.
5. Auditability: migration scripts write before/after JSONL backups and URL maps before cleanup.
