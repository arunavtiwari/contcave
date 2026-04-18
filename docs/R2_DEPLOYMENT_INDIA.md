# Cloudflare R2 Deployment Guide (India Optimized)

Follow these steps to finalize your enterprise storage setup for the India region.

## 1. Create the R2 Bucket
1. Log in to **Cloudflare** → **R2** → **Create Bucket**.
2. Name: `contcave-prod`.
3. **Location Hints**: Cloudflare automatically optimizes for the closest region (India). No manual selection is needed.

## 2. Generate API Credentials
1. Click **Manage R2 API Tokens** → **Create API Token**.
2. Permissions: Select **Object Read & Write**.
3. Copy the **Access Key ID** and **Secret Access Key**.

## 3. Configure CORS (Required for Browser Uploads)
In bucket **Settings** → **CORS Policy**, add this JSON:

```json
[
  {
    "AllowedOrigins": ["https://contcave.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 4. Public Access (CDN Speed)
1. In bucket **Settings**, go to **Public Access**.
2. Click **Connect Custom Domain**.
3. Enter `assets.contcave.com`. Use this as your `NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL`.

## 5. Environment Hand-off
Populate your `.env`:
```env
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL=https://assets.contcave.com
```

## 6. Run Migration
```bash
npx ts-node scripts/migrate-static-assets.ts
npx ts-node scripts/migrate-cloudinary-to-r2.ts
```
