# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-07-11

### Added
- **Initial Release**: Launch of Contcave platform starting with creative studio booking support in Delhi NCR.
- **Search & Discovery**: Location mapping with category search and map loaders (Leaflet).
- **Core Marketflows**: Booking reservation services, price breakdowns, and slot calendars.
- **Host Dashboard**: Management panels for listings, properties, calendar syncs, and payouts.
- **Admin Dashboard**: Verification status checks, user management, and platform analytics.
- **Ably Chat Service**: Full real-time message exchange and notification queues.
- **Easy Split (Cashfree)**: Automatic payment handling and T+1 split payout options routed through Fixie proxy.
- **R2 Storage Sync**: Cloudflare R2 media upload using AWS S3 client presigned hooks.
- **Encryption Service**: AES-256-CBC encryption layers for high-value PII database items.
- **Playwright Test Suite**: End-to-end validation for booking workflows.
- **Repository Standardizations**:
  - `README.md` and detailed guidelines.
  - `CONTRIBUTING.md` developer guide specifying React 19 forms, TS standards, and Pre-paint render synchronizations.
  - `CODE_OF_CONDUCT.md` setting communal guidelines.
  - `SECURITY.md` establishing vulnerability policies.
  - `.editorconfig` & `.gitattributes` to normalize workspace styles and line-endings.
  - `.vscode/settings.json` & `.vscode/extensions.json` to standardize local developer IDEs.
  - `.github/workflows/staging-e2e.yml` tracking staging pipeline validations.
