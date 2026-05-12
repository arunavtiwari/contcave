# Staging E2E Tests

The staging E2E suite uses Playwright against a deployed staging URL and writes QA-only records to the staging MongoDB database.

## Required environment

- `E2E_BASE_URL`: deployed staging URL. Production hosts are blocked.
- `E2E_DATABASE_URL`: staging/test/QA MongoDB URL. If omitted locally, the suite falls back to `DATABASE_URL`.
- `E2E_ALLOW_STAGING_WRITES=true`: explicit write guard.
- `E2E_ALLOWED_DATABASE_NAMES`: comma-separated exact database names that are allowed when the database name does not contain `staging`, `stage`, `test`, `qa`, or `e2e`. The local project is configured with `contcave` because that is the staging database.
- `E2E_EMAIL_DOMAIN`: deliverable domain for generated QA user emails.
- `E2E_AADHAAR_NUMBER`, `E2E_AADHAAR_OTP`: Cashfree Secure ID sandbox Aadhaar values, for example `655675523712` and `111000`.
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
