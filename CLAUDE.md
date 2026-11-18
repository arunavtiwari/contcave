# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What this project is

Contcave is a studio booking marketplace. The platform enables hosts to list and manage creative studios (photography, video, podcast, events) with availability and pricing controls, while allowing guests to discover and book these spaces.

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run type-check    # tsc --noEmit (run this before committing)
npm run check         # type-check + lint together
npm run lint:fix      # Auto-fix lint issues
npm run test:unit     # Vitest unit tests (pure logic, no DB or browser)
npm run eval:search   # Score the AI search parser on labelled queries
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

Middleware in `auth.config.ts` enforces route protection. `PROTECTED_ROUTES` requires auth; `ADMIN_ROUTES` requires a staff role (`ADMIN` or `FINANCE`).

## Admin permissions

Staff access is permission-based, from one map in `lib/user/permissions.ts`: `ADMIN` holds every permission, `FINANCE` holds `bookings.view` and `documents.view` (read-only bookings, owner invoices, receipts and payouts, plus PDF downloads). Never compare roles directly for admin features:

- Pages: `await requireAdminPage("permission")` from `lib/admin/guard.ts` (redirects to the user's own admin home).
- Server functions: `requirePermission("permission")`; actions: `createAction(schema, { requireAuth: true, allowedRoles: rolesWith("permission") }, ...)`.
- Navigation and booking tabs filter by permission (`constants/adminNav.ts`, `lib/admin/bookingTabs.ts`).

Admins manage staff at `/admin/dashboard/users`: adding a finance or admin user emails a set-password link (`sendPasswordLink` in `lib/user/passwordLink.ts`). An admin can't change their own role, the last admin can't be removed, and studio owners can't be made finance.

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

Four roles: `CUSTOMER` | `OWNER` | `ADMIN` | `FINANCE` (defined in both Prisma enum and `types/user.ts`).

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

## UI components

Every interactive control comes from `components/ui`. Check there before building any UI, and extend a shared component rather than copying it.

- Behaviour comes from Radix (focus, keyboard, ARIA, scroll lock); the look is ours (Tailwind tokens in `styles/globals.css`, `cva` variants, `cn`). `components.json` is set up for shadcn, using `react-icons` instead of lucide.
- Dialogs: `Dialog` is the one base. `components/modals/Modal.tsx` (title, body, actions) and `Sheet` (phone panel) are built on it, and so is every custom media dialog. Never hand-build a `fixed inset-0` overlay.
- Also shared: `Tabs` (`keepMounted` keeps hidden panels in the HTML for SEO), `NavTabs` (link tabs), `Popover`, `DropdownMenu`, `Tooltip`, `Switch`, `RadioGroup`, `Checkbox`, `Input`, `SearchInput`, `Textarea`, `Select`, `Spinner`, `LoadingOverlay`, `Button` (including `variant="link"`).
- Focus is a border colour change only: no `ring-*` focus styles and no shadows.
- Layers: page chrome stays below `z-100000`; dialogs are `z-100001`; menus, popovers and Select menus `z-100002`; tooltips `z-100003`.

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
| Ably | Real-time chat | `ABLY_CHAT_API` |
| MailerSend | Transactional email | `MAILERSEND_API_KEY` |
| Google OAuth + Calendar | Auth + host calendar sync | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| MongoDB Atlas | Database | `DATABASE_URL` |
| Anthropic (Claude) | AI search and Spot, one shared client and model in `lib/ai/claude.ts` | `ANTHROPIC_API_KEY` |

## Caching studio data

Studio data is read through Next's data cache, all under one tag, `STUDIOS_TAG` (`lib/listing/cacheTags.ts`): ranked feed pages (`lib/listing/feedCache.ts`), the public studio (`lib/listing/publicListing.ts`), related and featured studio cards (`lib/listing/related.ts`, `studioCards.ts`), the published-studios snapshot (`lib/listing/cities.ts`), reviews and amenities.

Invalidation is automatic: the Prisma client in `lib/prismadb.ts` drops `STUDIOS_TAG` after any write to `Listing`, `ListingSet`, `Package`, `ListingBlock`, `Review` or `Amenities` (`lib/listing/studioCacheInvalidation.ts`), so new code paths need nothing extra. Each cache also has a time ceiling for writes made outside a request (scripts, cron).

- New studio-derived caches: tag them with `STUDIOS_TAG`; if they read a model not in that list, add the model there.
- Never cache viewer-specific data: owners and admins read studios uncached (private location, archived studios), and date searches skip the feed cache because they depend on live bookings.
- Reservations, day statuses and Google Calendar events are always read live; blocked time slots come with the cached studio and are dropped on every `ListingBlock` write.

## Things to know

- Prisma's `contains` on MongoDB runs as an unescaped regex: wrap user search terms with `containsText()` from `lib/db/textSearch.ts`, or `+`, `.` and `(` break matches.
- `lib/prismadb.ts` is `server-only` and uses a global singleton to survive hot reloads in dev. Never import it from client components.
- `jsdom` and `isomorphic-dompurify` are in `serverExternalPackages` (`next.config.ts`) to avoid an ESM/CJS conflict at runtime — do not remove this.
- `Calendar.tsx` (FullCalendar) is only used in the host dashboard's `SyncCalendarTab`; it is not in the public listing page bundle.
- Secondary data fetches on `/listings/[listingId]` (reservations, user, reviews) already run in `Promise.all` — maintain this pattern when adding more.
- The `ListingHead` desktop gallery shows 5 images above the fold; all 5 `<Image>` components have `priority` set.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Analytics and tracking

GTM loads once in `app/(main)/layout.tsx`; GA4 and Google Ads are configured inside the container. All dataLayer events go through `lib/analytics/tracking.ts`, which also sends the matching Meta Pixel + Conversions API event under a shared `event_id`. Visitors are opted in until they decline in the cookie banner. `docs/tracking-events.md` is the event map — update it when adding or changing an event.
