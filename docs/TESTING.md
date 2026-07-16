# Testing Playbook

This document details the engineering guidelines, execution paths, and design patterns for testing the **ContCave** platform.

---

## 1. Testing Philosophy

We use three tiers of testing to ensure platform stability:
1. **Unit Tests**: For pure functions, mathematical utilities, and independent helper methods (e.g., price calculators, string formatters).
2. **Integration / API Tests**: For Server Actions and API endpoints, verifying database mutations and schema validations.
3. **End-to-End (E2E) Tests**: Driven by **Playwright**, simulating actual customer and host user interactions on real browser contexts.

---

## 2. Playwright E2E Architecture

Our E2E tests are configured to run against both local development environments (`localhost`) and isolated staging platforms.

### Core Architecture Guidelines:
- **Clean Fixtures over Shared State**: Never rely on hardcoded QA accounts. Always create new users and listings using `createUserFixture` or `createActiveListingFixture` dynamically before each test.
- **Strict Teardown**: Track all created test database IDs via `trackCreated("type", id)` so they are cleaned up programmatically at the end of the test execution block.
- **Hydration-Aware Selectors**: Next.js App Router renders pages on the server immediately, but client interactive components take a moment to hook up event listeners (hydration lag).
  - *Best Practice*: Never click an element immediately without validating that the page has settled. Use visual checkpoints and `waitFor({ state: "visible" })` on elements (like modals/drawers) to verify the action succeeded, retrying if necessary.
- **Serial Execution**: Staging E2E tests must run serially because they interact with shared external APIs (such as Cashfree PG sandbox) and write to a single staging database. Running tests in parallel in these environments causes database conflicts and API rate-limiting issues.

---

## 3. E2E Test Suite Inventory

Below is a summary of our active Playwright E2E test inventory:

| Test Spec File | Feature Area | Individual Test Cases |
|---|---|---|
| [booking.e2e.spec.ts](../tests/e2e/booking.e2e.spec.ts) | Booking checkout payment paths | 3 |
| [booking-service.e2e.spec.ts](../tests/e2e/booking-service.e2e.spec.ts) | Payout lifecycles & webhook automations | 6 |
| [admin-listings.e2e.spec.ts](../tests/e2e/admin-listings.e2e.spec.ts) | Admin listings moderation review flows | 4 |
| [owner-verification.e2e.spec.ts](../tests/e2e/owner-verification.e2e.spec.ts) | Host onboarding Aadhaar KYC verifications | 2 |
| [edit-property.e2e.spec.ts](../tests/e2e/edit-property.e2e.spec.ts) | Host editing property details & packages | 1 |
| [rent-modal.e2e.spec.ts](../tests/e2e/rent-modal.e2e.spec.ts) | Host studio space creation wizard | 2 |
| [favorites.e2e.spec.ts](../tests/e2e/favorites.e2e.spec.ts) | Customer listing wishlists | 1 |
| [chat.e2e.spec.ts](../tests/e2e/chat.e2e.spec.ts) | Host-guest real-time chat websockets | 1 |
| [filters.e2e.spec.ts](../tests/e2e/filters.e2e.spec.ts) | Studio feed queries & location filters | 1 |
| [invoice-service.e2e.spec.ts](../tests/e2e/invoice-service.e2e.spec.ts) | Tax invoices & payouts calculations | 8 |
| [reviews.e2e.spec.ts](../tests/e2e/reviews.e2e.spec.ts) | Customer rating & review submissions | 1 |
| **Total Suite** | | **30** |

---

This section documents all E2E spec files and their exact regression scenarios:

1. **`booking.e2e.spec.ts`** (Booking Staging Flow):
   - Instant booking payment flow via Cashfree sandbox.
   - Unauthenticated checkout blockage and login modal rendering.
   - API-level double-booking prevention.
   - Addon over-quantity and inactive listing checkout rejection.

2. **`booking-service.e2e.spec.ts`** (Booking Services & Payout Lifecycle):
   - Instant booking confirmation without premature payout scheduling.
   - Checked-in booking auto-completion and post-booking payouts.
   - Client-driven extension requests, approval expiry, and refunds.
   - Signed local QStash webhook delivery verification.

3. **`admin-listings.e2e.spec.ts`** (Admin Listing Moderation):
   - Admin Listings tab navigation.
   - Enterprise review modal checks (with KYC status, document references, package details).
   - Approval confirmation flow (with revalidation).
   - Rejection reason input validation flow.

4. **`owner-verification.e2e.spec.ts`** (Owner Onboarding KYC):
   - Fresh host registration, phone/email validation, Aadhaar OCR, and bank details verification.
   - Incomplete verification step blockage and input validation error surfacing.

5. **`edit-property.e2e.spec.ts`** (Host Property Editor):
   - Host saving modifications to listings, packages, and sets.
   - No-op save skipping to avoid database churn.

6. **`rent-modal.e2e.spec.ts`** (Host Listings Wizard):
   - Wizard validation checks (missing category, photos, details).
   - Step-by-step creation of pending listings.

7. **`favorites.e2e.spec.ts`** (Customer Wishlists):
   - Guest wishlisting a listing from the detail page.
   - Favorites list visibility under `/dashboard/favorites`.
   - Removing favorites from the dashboard card.

8. **`chat.e2e.spec.ts`** (Real-time Communication):
   - Customer-host Ably websocket messaging within reservation chat rooms.
   - Real-time updates synchronization on customer and host screens.

9. **`filters.e2e.spec.ts`** (Feed Filtering):
   - Studio feed filtering by city location.
   - Advanced option toggles (e.g. multi-set filters).

10. **`invoice-service.e2e.spec.ts`** (Invoice System & PDF Generation):
    - Concurrent customer tax invoice generation idempotency checks.
    - Issuer validation (ContCave Arkanet tax invoice series for non-GST hosts, Host studio series for GST hosts).
    - Platform fee invoice details, tax splits (IGST/CGST/SGST), and payout calculations.

11. **`reviews.e2e.spec.ts`** (Customer Reviews):
    - Submit comment and rating for a completed reservation.
    - Display verification of the submitted review on the listing page.

---

## 4. Environment Variables for E2E

Tests require a dedicated set of E2E environment parameters defined in `.env.e2e` (or configured inside the CI/CD secrets):

| Parameter | Purpose | Example |
|---|---|---|
| `E2E_ALLOW_STAGING_WRITES` | Guard block protecting against writing to production databases. Must be exactly `true`. | `true` |
| `E2E_BASE_URL` | Base application target URL. Production hosts are blocked. | `http://localhost:3000` |
| `E2E_DATABASE_URL` | Dedicated test database URI. | `mongodb://.../contcave-e2e` |
| `E2E_EXPECTED_DATABASE_NAME` | Checks database name before executing wipes to prevent accidental production drops. | `contcave-e2e` |
| `E2E_EMAIL_DOMAIN` | Target email domain for virtual transactional mail boxes. | `mailersend.contcave.com` |
| `E2E_BANK_ACCOUNT_NUMBER` | Bank mock account for Cashfree checkout checks. | `1234567890` |
| `E2E_BANK_IFSC` | Bank IFSC verification code. | `HDFC0001234` |
| `E2E_BANK_NAME` | Mock bank name. | `HDFC Bank` |
| `E2E_BANK_HOLDER` | Mock account holder name. | `John Doe` |
| `E2E_CASHFREE_PAYMENT_METHOD` | JSON payment method. | `{"type":"upi","vpa":"success@gocash"}` |

### Optional Storage Cleanup Variables:
If Cloudflare R2 file storage secrets are set, E2E cleanup will also purge temporary uploaded documents from the bucket:
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`

---

## 5. Third-Party Integrations Setup

### Cashfree Smart OCR setup (Aadhaar KYC)
Owner onboarding Aadhaar verification is OCR-only. The application invokes the Cashfree Secure ID Smart OCR API at `POST /verification/bharat-ocr` with `document_type=AADHAAR`.

To enable this verification inside the E2E staging environment:
1. Log in to the Cashfree Merchant Dashboard.
2. Navigate to **Secure ID** or **KYC Studio**.
3. Enable **Smart OCR for Aadhaar** on the sandbox account first, then production after validation.
4. Confirm the app uses the Secure ID credentials in `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`.
5. Keep `CASHFREE_ENV=SANDBOX` for staging.

> [!NOTE]
> The application does not persist raw Aadhaar file uploads. It streams the file to Cashfree from the server action and stores only the Cashfree reference ID and the last four digits of the Aadhaar number when OCR returns a successful verification.

---

## 6. Test Commands

### Run Staging E2E Suite
Runs the Playwright tests on the target browser:
```bash
npm run test:e2e:staging
```

### Run a Specific Spec File
For faster local verification, target a single test file:
```bash
npx playwright test tests/e2e/favorites.e2e.spec.ts
```

### Debug Mode (Headed UI)
Runs the test with the visual browser visible, stepping through each interaction:
```bash
npx playwright test --ui
```

---

## 7. Teardown & Database Safety
After every run, the runner prints:
```text
[e2e] Cleaned X users, Y listings, Z reservations for http://localhost:3000
```
This is managed by `tests/e2e/support/run-state.ts`, which tracks all dynamic database operations and purges them sequentially to leave the target environment clean. All test records are prefixed with `qa-e2e-...`, and cleanup refuses to delete anything outside that namespace.
