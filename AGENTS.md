# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this project is

Contcave is a studio booking marketplace for India — hosts list creative studios (photography, video, podcast, events), guests discover and book them. Think Airbnb for creative spaces, starting with Delhi NCR.

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run type-check    # tsc --noEmit (run this before committing)
npm run check         # type-check + lint together
npm run lint:fix      # Auto-fix lint issues
npm run test:e2e      # Playwright end-to-end tests
npx prisma studio     # Open Prisma database GUI
npx prisma generate   # Regenerate client after schema changes
```

## Bash commands

Prefer these over defaults when available. Fall back silently if missing.

- **Search content:** `rg` over `grep`
- **Find files:** `fd` over `find`
- **Structural/AST search:** `ast-grep` (`sg`) for refactors and pattern-based code search in TS/TSX
- **JSON:** `jq` for parsing, filtering, or transformation in pipelines
- **GitHub operations:** `gh` for PRs, issues, reviews, CI status, releases
- **Circular deps:** `madge --circular`
- **Dead code:** `knip`
- **Typecheck only:** `tsc --noEmit`

## Route structure

```
app/
  (main)/
    (public)/        # Unauthenticated pages: /, /home, /listings/[listingId], /about, /blog
    dashboard/       # Authenticated user pages: /bookings, /chat, /properties, /reservations, /profile, /payments
  (admin)/           # Admin panel at /admin/dashboard
  actions/           # Server Actions (getListings, getCurrentUser, reservationActions, etc.)
  api/               # API Routes for webhooks, Cashfree payments, uploads, Ably auth
```

Middleware in `auth.config.ts` enforces route protection. `PROTECTED_ROUTES` requires auth; `ADMIN_ROUTES` requires `role === ADMIN`.

## Server Action pattern

All mutations use the `createAction` wrapper from `lib/actions-utils.ts`:

```ts
export const myAction = createAction(
  zodSchema,
  { requireAuth: true, allowedRoles: ["OWNER"] },
  async (data, { user }) => { /* handler */ }
);
```

Returns `ActionResponse<T> = { success, data?, error?, details? }`. Throw `UserFacingError` for messages intended to reach the client. Other errors are logged and returned as generic 500s in production.

## API route pattern

All routes use helpers from `lib/api-utils.ts`:

```ts
return createSuccessResponse(data);          // { success: true, data, timestamp }
return createErrorResponse("message", 400);  // { success: false, error, timestamp }
return handleRouteError(error, "context");   // logs + returns 500
```

## Data types

Prisma models are never passed to client components directly. Use the "safe" variants which serialize `Date → string`:

- `SafeUser` — from `types/user.ts`; includes `role: UserRole`
- `safeListing` — from `types/listing.ts`; omits `addons`, `packages`, `operationalDays/Hours`, `actualLocation`
- `SafeReservation` — from `types/reservation.ts`

Three roles: `CUSTOMER` | `OWNER` | `ADMIN` (defined in both Prisma enum and `types/user.ts`).

## Encryption

Sensitive fields (bank account number, IFSC, GSTIN, Cashfree vendor ID) are stored AES-256-CBC encrypted. Each encrypted value has a companion `*IV` field storing the initialization vector. Always use `encryptionService` from `lib/security/encryption.ts` (server-only) and `decryptPaymentDetailsInternal` from `lib/payment-details.ts` to read them — never access the raw DB fields directly.

## Payments (Cashfree)

All Cashfree API functions live in `lib/cashfree/cashfree.ts`:
- `cfCreateOrder` — payment orders (PG API)
- `cfEnsureVendor` / `cfUpdateVendor` — Easy Split vendor management
- `cfOnDemandTransfer` — manual payouts to vendors
- `cfCreateRefund` / `cfFetchOrder` — order management

`CASHFREE_ENV=SANDBOX|PRODUCTION` controls which base URL is used. All Cashfree HTTP calls must go through the Fixie proxy (`getFixieProxyAgent()` from `lib/fixie-proxy.ts`) because Cashfree enforces IP whitelisting. Do not call Cashfree directly without the proxy agent.

`CASHFREE_VENDOR_SCHEDULE_OPTION` (default `2` = T+1) sets the settlement schedule for new vendors — check which schedule IDs are enabled in the merchant dashboard before changing this.

## Storage

Images/files are stored in Cloudflare R2, accessed via the AWS S3 SDK (`lib/storage/r2.ts`). Presigned URLs are generated server-side for uploads. Public CDN is at `assets.contcave.com`.

## Listing cards

The listing card is composed from three sub-components in `components/listing/`:
- `ListingCardMedia` — image slideshow, price pill, heart button, reservation status badge, verified badge (top-left pill)
- `ListingCardContent` — location label, studio name (`line-clamp-2`), chips (sq ft, pax, rating)
- `ListingCardActions` — host/admin action buttons

`ListingCardData` in `ListingCard.tsx` is the shared interface; `safeListing` satisfies it directly so no mapping is needed in `ListingFeed`.

## Key external services

| Service | Purpose | Config env vars |
|---|---|---|
| Cashfree | Payments + Easy Split payouts | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` |
| Fixie | Outbound proxy for Cashfree IP whitelist | `FIXIE_URL` |
| Cloudflare R2 | File storage | `CLOUDFLARE_R2_*` |
| Ably | Real-time chat | `ABLY_API_KEY` |
| MailerSend | Transactional email | `MAILERSEND_API_KEY` |
| Google OAuth + Calendar | Auth + host calendar sync | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| MongoDB Atlas | Database | `DATABASE_URL` |

## Things to know

- `lib/prismadb.ts` is `server-only` and uses a global singleton to survive hot reloads in dev. Never import it from client components.
- `jsdom` and `isomorphic-dompurify` are in `serverExternalPackages` (`next.config.ts`) to avoid an ESM/CJS conflict at runtime — do not remove this.
- `Calendar.tsx` (FullCalendar) is only used in the host dashboard's `SyncCalendarTab`; it is not in the public listing page bundle.
- Secondary data fetches on `/listings/[listingId]` (reservations, user, reviews) already run in `Promise.all` — maintain this pattern when adding more.
- The `ListingHead` desktop gallery shows 5 images above the fold; all 5 `<Image>` components have `priority` set.
