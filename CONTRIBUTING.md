# Contributing to Contcave

Thank you for your interest in contributing to Contcave! This document outlines the technical standards, project conventions, and workflow guidelines required to maintain our codebase quality.

---

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Development Workflow](#development-workflow)
3. [Branching & PR Guidelines](#branching--pr-guidelines)
4. [Technology Stack & Core Architecture](#technology-stack--core-architecture)
5. [Coding & Engineering Standards](#coding--engineering-standards)
6. [Design System & Interface Guidelines](#design-system--interface-guidelines)

---

## Code of Conduct

All contributors must adhere to our [Code of Conduct](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/CODE_OF_CONDUCT.md). Please report violations to **support@contcave.com**.

---

## Development Workflow

### 1. Prerequisite Setup
Make sure you have Node.js and a running MongoDB Atlas database. Set up your `.env` and `.env.e2e.local` based on the environment registry.

### 2. Local Database Synchronization
Regenerate the Prisma client whenever the database schema changes:
```bash
npx prisma generate
```

To view or manage the database locally, use Prisma Studio:
```bash
npx prisma studio
```

### 3. Local Development Server
Start the Next.js development server:
```bash
npm run dev
```

---

## Branching & PR Guidelines

- **Branch Naming**: Use clean prefix naming:
  - New features: `feature/short-desc`
  - Bug fixes: `fix/short-desc`
  - Performance improvements: `perf/short-desc`
  - Chore/refactoring: `chore/short-desc`
- **Atomic Commits**: Keep commits small, self-contained, and focused on a single change.
- **Pre-Commit Verification**: Run the standard checks locally before pushing or creating a PR:
  ```bash
  npm run check
  ```
  This command will run `type-check` (`tsc --noEmit`) and `lint` (`eslint .`) together. Ensure there are **no warnings or errors**.
- **Pull Request Checklist**:
  - [ ] Linting and type checks pass.
  - [ ] E2E Playwright tests pass:
    ```bash
    npm run test:e2e
    ```
  - [ ] Code follows the React 19 / Next.js 16 standards.
  - [ ] Database migrations are properly handled (if applicable).

---

## Technology Stack & Core Architecture

* **Framework**: Next.js 16 (App Router) & React 19
* **Database / ORM**: Prisma with MongoDB Atlas
* **Styling**: Tailwind CSS 4 & Vanilla CSS
* **State Management**: URL search parameters (preferable for lists/filters) and Zustand (client-only UI state)
* **Real-time / Communication**: Ably (chat & live updates), MailerSend (transactional email)
* **Payments**: Cashfree PG & Easy Split API (via Fixie Proxy)
* **Storage**: AWS S3 SDK for Cloudflare R2 (presigned URL uploads)

---

## Coding & Engineering Standards

### 1. Strict TypeScript (No `any` Types)
We enforce type safety across the application. Do **not** use the `any` or `any[]` types. Always specify strict, robust interfaces or types for your props, forms, and database serializations.

### 2. Next.js 16 Async Params
In Next.js 16, `params` and `searchParams` in pages, layouts, and route handlers are **Promises**. They **must be awaited** before accessing their properties.
```tsx
// ✅ Correct
interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingPage({ params }: PageProps) {
  const { listingId } = await params;
  // Use listingId...
}
```

### 3. Pre-paint State Sync (Adjusting State During Render)
When a component's internal state must reset or synchronize due to a prop change, **do not** use `useEffect` (which causes a post-paint double render and visual flicker) or the `key` prop (which triggers a full DOM remount and visual glitch). Instead, track the previous prop value and update state inline during the render phase.

```tsx
// ✅ Correct: Pre-paint state sync (zero flicker, zero wasted renders)
const [activeSegment, setActiveSegment] = useState<"start" | "end">("start");
const [prevStart, setPrevStart] = useState(selectedStart);

if (selectedStart !== prevStart) {
  setPrevStart(selectedStart);
  if (!selectedStart) {
    setActiveSegment("start");
  }
}
```

### 4. React 19 Form Architecture
Every interactive form must use a corresponding **Zod schema** for validation, integrated with `react-hook-form` and the `@hookform/resolvers/zod` resolver. Use React 19's `useActionState` to handle form actions and submission/error states.

```tsx
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitAction } from '@/actions/submit-action';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  amount: z.number().min(1, 'Amount must be at least 1'),
});

type FormValues = z.infer<typeof schema>;

export function BookingForm() {
  const [state, formAction, isPending] = useActionState(submitAction, null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form action={formAction} onSubmit={handleSubmit((data) => formAction(data))}>
      <input {...register('email')} className={errors.email ? 'border-red-500' : ''} />
      {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Processing...' : 'Submit'}
      </button>

      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

### 5. Server Action Pattern
All database write mutations must use the `createAction` wrapper from [lib/actions-utils.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/actions-utils.ts):
```ts
export const createBookingAction = createAction(
  zodSchema,
  { requireAuth: true, allowedRoles: ["CUSTOMER"] },
  async (data, { user }) => {
    // Handler logic...
  }
);
```
Never return raw Prisma database models containing Dates directly to the client; serialize them to the "safe" variants (e.g., `SafeUser`, `safeListing`, `SafeReservation`).

### 6. API Route Pattern
All REST API routes must use the standard response wrappers in [lib/api-utils.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/api-utils.ts):
- Success: `return createSuccessResponse(data);`
- Error: `return createErrorResponse("message", 400);`
- Uncaught: `return handleRouteError(error, "context");`

### 7. Encryption Standards (Data Privacy)
Highly sensitive information (e.g., bank accounts, IFSC, GSTIN, Cashfree vendor details) **must** be stored AES-256-CBC encrypted in the database.
- Use the `encryptionService` from [lib/security/encryption.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/security/encryption.ts) (server-only) to write encrypted fields.
- Use `decryptPaymentDetailsInternal` from [lib/payment-details.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/payment-details.ts) to read them.
- **Never** read the raw encrypted database fields directly from client components.

### 8. Payments (Cashfree Proxy)
To comply with Cashfree's strict IP whitelisting rules in both Sandbox and Production:
- All outbound Cashfree API calls **must** route through the Fixie proxy agent. Use `getFixieProxyAgent()` from [lib/fixie-proxy.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/fixie-proxy.ts).
- Cashfree methods reside in [lib/cashfree/cashfree.ts](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/lib/cashfree/cashfree.ts).

---

## Design System & Interface Guidelines

### 1. Styling & Color Palette
Follow the Monochromatic-first aesthetic:
- **Primary Display**: Georgia Serif for headings.
- **Primary Body**: Geist Sans for interface typography.
- **Accent (Gold)**: `#c8a96e` for brand overlays and active states.
- **Background**: `#ffffff` (Card borders: `#e5e5e5`, Dividers: `#f5f5f5`).

### 2. Motion Standards
- Use transitions with timing: `ease-out` or `cubic-bezier(0.16, 1, 0.3, 1)`.
- Restrict scaling hover effects to `1.02x` or `1.05x`. Avoid aggressive pulses, shimmer states, or raw high-frequency animations.
