# Contcave

Contcave is a premium studio booking marketplace for India—allowing hosts to list creative spaces (photography, video, podcast, events) and guests to discover and reserve them. Designed with a **"Quiet Luxury"** aesthetic and engineered to enterprise-grade standards.

---

## 📖 Table of Contents
1. [Overview & Product Goals](#overview--product-goals)
2. [Key Architecture & Features](#key-architecture--features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Getting Started & Local Setup](#getting-started--local-setup)
6. [Available Commands](#available-commands)
7. [Environment Variables Registry](#environment-variables-registry)
8. [Database Models](#database-models)
9. [Related Documentation](#related-documentation)

---

## 🎨 Overview & Product Goals

Contcave connects creative professionals with premium spaces. Think of it as **Airbnb for creative spaces**, starting with Delhi NCR. 
- **Hosts (Owners)**: List creative studios with detailed hourly pricing, packages, add-ons, availability slots, and payment split terms.
- **Guests (Customers)**: Discover spaces, filter by category/location, query availability, initiate bookings, make real-time payments, and communicate with hosts.
- **Admin**: Oversee reviews, check reservations, confirm verified host status, and handle platform integrations.

---

## ⚙️ Key Architecture & Features

- **Next.js 16 (App Router) & React 19**: Powered by Server Components by default for fast page loading, utilizing React 19's `useActionState` and strict asynchronous layout/params routing.
- **Automated Payment Split (Cashfree)**: Complete payments integration supporting automated payouts to host vendors via Cashfree Easy Split (T+1/T+2 settlement options), routed through a **Fixie proxy** for strict IP whitelisting.
- **Secure Encrypted Fields**: High-value PII (bank accounts, IFSC, GSTIN, vendor details) are stored AES-256-CBC encrypted in the database.
- **Real-Time Communications**: Chat threads and inbox notifications are handled dynamically using Ably's WebSockets architecture.
- **Asset Management**: Fast upload workflows using AWS S3 SDK for Cloudflare R2 storage, optimized with custom Next.js cloudloaders and served via assets CDN.
- **Playwright E2E Tests**: Structured end-to-end user scenarios covering listing management, booking flow, and payments.

---

## 💻 Technology Stack

* **Front-End & UI**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Swiper, FullCalendar, react-leaflet.
* **Database & ORM**: MongoDB Atlas, Prisma ORM.
* **Payments Integration**: Cashfree PG & Easy Split.
* **Web Proxies**: Fixie.
* **Messaging & Real-time**: Ably.
* **Emails**: MailerSend.
* **Authentication**: Next-Auth (v5 Beta) & Google OAuth.

---

## 📂 Project Structure

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

## 🚀 Getting Started & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd contcave
npm install
```

### 2. Configure Environment Variables
Create a `.env` and `.env.e2e.local` file in the root directory. Use the template below or look at `.env.example` (if present) for standard default strings.

### 3. Generate the database client
```bash
npx prisma generate
```

### 4. Run the Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

---

## 🛠️ Available Commands

Here are the primary commands configured in `package.json`:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server in watch mode. |
| `npm run build` | Builds the production application bundle. |
| `npm run type-check` | Runs the TypeScript compiler (`tsc --noEmit`) to verify types. |
| `npm run check` | Runs typechecks and ESLint checks together before committing. |
| `npm run lint:fix` | Runs ESLint and applies automatic styling/formatting fixes. |
| `npm run test:e2e` | Runs Playwright end-to-end test cases locally. |
| `npm run test:e2e:staging` | Runs E2E tests targetting the staging build environment. |
| `npx prisma generate` | Re-generates the database client mapping after prisma updates. |
| `npx prisma studio` | Launches the interactive Prisma graphical DB viewer. |

---

## 🔑 Environment Variables Registry

Ensure these environment variables are set in your local `.env`:

```env
# Database
DATABASE_URL=mongodb+srv://...

# Auth.js / Next Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cashfree Payment Gateway and Easy Split
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_ENV=SANDBOX # or PRODUCTION
CASHFREE_VENDOR_SCHEDULE_OPTION=2 # Settlement scheduling configuration

# Cashfree Secure ID / OKYC (never substitute the PG credentials above)
CASHFREE_CLIENT_ID=...
CASHFREE_CLIENT_SECRET=...

# Outbound Proxy
FIXIE_URL=http://...

# Real-time Integration
ABLY_API_KEY=...

# Cloudflare R2 / AWS S3
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_ENDPOINT=...
CLOUDFLARE_R2_BUCKET_NAME=...

# Email Gateway
MAILERSEND_API_KEY=...
```

---

## 🗄️ Database Models

We use Prisma with MongoDB. Important structures include:
- **User**: Holds primary authentication, user profiles, and roles (`CUSTOMER` | `OWNER` | `ADMIN`).
- **Listing**: The core studio space listing (pax, area size, hourly rate, packages, availability).
- **Reservation**: Active booking instances linking customers to listings (includes payment states, price breakdowns, dates).
- **Review**: Studio ratings and customer descriptions.
- **Conversation & Message**: Ably-backed threads tracking chat records.
- **Vendor**: Encrypted Easy Split payout records for registered studio hosts.

---

## 📄 Related Documentation

Make sure to review specific documentation directories for architectural deep-dives:
* 📦 [docs/STORAGE_ARCHITECTURE.md](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/docs/STORAGE_ARCHITECTURE.md) — Presigned upload flow structures and Cloudflare R2 configurations.
* ✉️ [docs/EMAIL_TEMPLATES.md](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/docs/EMAIL_TEMPLATES.md) — MailerSend transactional templates.
* 🧑‍💻 [CONTRIBUTING.md](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/CONTRIBUTING.md) — Contribution process, React 19 render loop standards, and Git workflows.
* 🛡️ [SECURITY.md](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/SECURITY.md) — Vulnerability disclosure policy and safety compliance.
* 📜 [LICENSE](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/LICENSE) — Ownership terms.
