Marketspace for renting shoot spaces

## GitHub Actions Cron Setup

This project uses GitHub Actions to trigger payment split cron jobs. To set this up:

### Required Steps:

1. **Set Environment Variable in Vercel:**
   - Go to your Vercel project settings
   - Add an environment variable: `CRON_SECRET` with a secure random string (e.g., generate one using `openssl rand -hex 32`)

2. **Set GitHub Secret:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add a new repository secret named `CRON_SECRET` with the same value as your Vercel environment variable

3. **Update Vercel Domain (if needed):**
   - In `.github/workflows/payment-split-cron.yml`, replace `contcave.vercel.app` with your actual Vercel domain

### How it works:

- The GitHub Action runs daily at midnight IST (5:30 PM UTC)
- It triggers the `/api/cron/easy-split` endpoint on your Vercel deployment
- The endpoint requires the GitHub secret for security
