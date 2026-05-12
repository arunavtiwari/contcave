# Staging E2E Tests

The staging E2E suite uses Playwright against a deployed staging URL and writes QA-only records to the staging MongoDB database.

## Required environment

- `E2E_BASE_URL`: deployed staging URL. Production hosts are blocked.
- `E2E_DATABASE_URL`: staging/test/QA MongoDB URL. If omitted locally, the suite falls back to `DATABASE_URL`.
- `E2E_ALLOW_STAGING_WRITES=true`: explicit write guard.
- `E2E_ALLOWED_DATABASE_NAMES`: comma-separated exact database names that are allowed when the database name does not contain `staging`, `stage`, `test`, `qa`, or `e2e`. The local project is configured with `contcave` because that is the staging database.
- `E2E_EMAIL_DOMAIN`: deliverable domain for generated QA user emails.
- `E2E_ENABLE_CASHFREE_OCR=true`: opt in to the real Aadhaar Smart OCR happy-path. Leave unset/false in CI until Smart OCR is enabled on the Cashfree Secure ID account.
- `E2E_BANK_ACCOUNT_NUMBER`, `E2E_BANK_IFSC`, `E2E_BANK_NAME`, `E2E_BANK_HOLDER`: Cashfree sandbox bank values, for example `026291800001191`, `YESB0000262`, `YES Bank`, and `John Doe`.
- `E2E_CASHFREE_PAYMENT_METHOD`: JSON payment method, for example `{"type":"upi","vpa":"testsuccess@gocash"}`.

R2 cleanup also uses the existing Cloudflare R2 secrets when available:

- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`

## Running

For local runs, app secrets can stay in `.env`; test-only settings belong in `.env.e2e.local`, which is ignored by git and loaded automatically after `.env`.

```bash
npx playwright install chromium
npm run test:e2e:staging
```

The suite runs serially because it uses real providers and shared staging resources. Records are prefixed with `qa-e2e-...` and cleanup refuses to delete anything outside that namespace.

## Cashfree Smart OCR setup

Owner Aadhaar KYC is OCR-only. The app calls Cashfree Secure ID Smart OCR at `POST /verification/bharat-ocr` with `document_type=AADHAAR`.

To enable it:

1. Log in to the Cashfree Merchant Dashboard.
2. Open Secure ID or KYC Studio.
3. Enable Smart OCR for Aadhaar on the sandbox account first, then production after validation.
4. Confirm the app uses the Secure ID credentials in `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`.
5. Keep `CASHFREE_ENV=SANDBOX` for staging.
6. Set `E2E_ENABLE_CASHFREE_OCR=true` in GitHub staging secrets only after sandbox OCR is active.

The app does not store raw Aadhaar uploads. It sends the file to Cashfree from the server action and stores only the Cashfree reference id and Aadhaar last four digits when OCR returns a valid Aadhaar result.
