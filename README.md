# Contcave

Contcave is a marketplace platform for discovering and booking creative studios. It connects creative professionals with hosts who manage spaces for photography, video, podcasts, and events.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Key Features](#architecture--key-features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup & Local Development](#setup--local-development)
6. [Available Commands](#available-commands)
7. [Database Schema](#database-schema)
8. [Project Documentation](#project-documentation)

---

## Overview

Contcave connects creative professionals with hosts who manage creative spaces.
- **Hosts (Owners)**: List creative studios with detailed hourly pricing, packages, add-ons, availability slots, and payment split configurations.
- **Guests (Customers)**: Discover spaces, filter by category/location, query availability, initiate bookings, make real-time payments, and communicate with hosts.
- **Admins**: Oversee reviews, check reservations, confirm verified host status, and manage platform integrations.

---

## Architecture & Key Features

- **Next.js 16 (App Router) & React 19**: Powered by Server Components by default for fast page loading, utilizing React 19's `useActionState` and strict asynchronous layout/params routing.
- **Automated Payment Split (Cashfree)**: Complete payments integration supporting automated payouts to host vendors via Cashfree Easy Split (T+1/T+2 settlement options), routed through a Fixie proxy for strict IP whitelisting.
- **Secure Encrypted Fields**: High-value PII (bank accounts, IFSC, GSTIN, vendor details) are stored AES-256-CBC encrypted in the database.
- **Real-Time Communications**: Chat threads and inbox notifications are handled dynamically using Ably's WebSockets architecture.
- **Asset Management**: Fast upload workflows using AWS S3 SDK for Cloudflare R2 storage, optimized with custom Next.js cloudloaders and served via assets CDN.
- **Playwright E2E Tests**: Structured end-to-end user scenarios covering listing management, booking flow, and payments.
- **Background Jobs & Scheduling (QStash)**: Time-sensitive tasks (booking expirations, reminders, auto-completions) are managed dynamically via Upstash QStash webhook dispatches.

---

## Technology Stack

- **Front-End & UI**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Swiper, FullCalendar, react-leaflet.
- **Database & ORM**: MongoDB Atlas, Prisma ORM.
- **Payments Integration**: Cashfree PG & Easy Split.
- **Web Proxies**: Fixie.
- **Messaging & Real-time**: Ably.
- **Emails**: MailerSend.
- **Background Jobs & Scheduling**: Upstash QStash.
- **Authentication**: Next-Auth (v5 Beta) & Google OAuth.

---

## Project Structure

```
contcave/
├── app/
│   ├── (main)/
│   │   ├── (public)/      # Unauthenticated public pages (/, /listings/[listingId], /about, /blog)
│   │   └── dashboard/     # Authenticated client & host dashboards (/bookings, /chat, /profile)
│   ├── (admin)/           # Admin dashboard (/admin/dashboard)
│   ├── actions/           # Server Actions (getListings, getCurrentUser, reservationActions)
│   └── api/               # API Routes (webhooks, Ably keys, Cashfree API, upload signatures)
├── components/            # UI components (Select, Button, listing cards, map loaders, chat clients)
├── docs/                  # Detailed architectural guidelines and identity documents
├── hooks/                 # Custom client hooks (e.g. useActiveChat, useAuth)
├── lib/                   # Server-only utilities, Prisma singleton, and Cashfree/Fixie services
├── prisma/                # Prisma schema file definitions
├── public/                # Static assets, fonts, icons
├── schemas/               # Zod forms and validation schemas
├── tests/                 # Playwright E2E integration test suites
└── types/                 # Standard safe serialization structures (SafeUser, SafeListing)
```

---

## Setup & Local Development

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd contcave
npm install
```

### 2. Configure Environment Variables
Create `.env` and `.env.e2e.local` files in the root directory. Populate them using the `.env.example` template.

### 3. Generate the Database Client
```bash
npx prisma generate
```

### 4. Run the Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

---

## Available Commands

Here are the primary commands configured in `package.json`:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server in watch mode |
| `npm run build` | Builds the production application bundle |
| `npm run type-check` | Runs the TypeScript compiler (`tsc --noEmit`) to verify types |
| `npm run check` | Runs typechecks and ESLint checks together before committing |
| `npm run lint:fix` | Runs ESLint and applies automatic styling/formatting fixes |
| `npm run test:e2e` | Runs Playwright end-to-end test cases locally |
| `npm run test:e2e:staging` | Runs E2E tests targeting the staging build environment |
| `npx prisma generate` | Re-generates the database client mapping after prisma updates |
| `npx prisma studio` | Launches the interactive Prisma graphical DB viewer |

---

## Database Schema

We use Prisma with MongoDB. Important structures include:
- **User**: Holds primary authentication, user profiles, and roles (`CUSTOMER` | `OWNER` | `ADMIN`).
- **Listing**: The core studio space listing (pax, area size, hourly rate, packages, availability).
- **Reservation**: Active booking instances linking customers to listings (includes payment states, price breakdowns, dates).
- **Review**: Studio ratings and customer descriptions.
- **Conversation & Message**: Ably-backed threads tracking chat records.
- **Vendor**: Encrypted Easy Split payout records for registered studio hosts.

---

## Project Documentation

For architectural deep-dives and specific setups, refer to the documentation:
* [Storage Architecture](docs/STORAGE_ARCHITECTURE.md) — Presigned upload flow structures and Cloudflare R2 configurations.
* [Email Templates](docs/EMAIL_TEMPLATES.md) — MailerSend transactional templates.
* [WhatsApp Templates](docs/WHATSAPP_TEMPLATES.md) — Meta WhatsApp webhook integration message templates.
* [QStash Maintenance Schedules](docs/QSTASH_SCHEDULES.md) — Scheduled background jobs and cron configurations.
* [Testing Playbook](docs/TESTING.md) — Architectural guidelines and design patterns for unit, integration, and E2E tests, including staging environments, Cashfree OCR setups, and dynamic file cleanups.
* [Contributing Guidelines](CONTRIBUTING.md) — Code quality standards, React 19 render loop, and Git workflows.
* [Security Policies](SECURITY.md) — Vulnerability disclosure policy and safety compliance.
* [License Terms](LICENSE) — Ownership terms.
