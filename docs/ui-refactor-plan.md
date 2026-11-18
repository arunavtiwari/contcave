# UI components: move to shadcn/ui on Radix

Owner: _unassigned_ · Written 2026-11-18 · Status: planned

## Goal

Every interactive primitive in `components/ui` (dialogs, tooltips, tabs, switches, checkboxes, comboboxes, sheets) comes from **shadcn/ui on Radix**, styled with ContCave's existing Tailwind tokens, and every feature uses those shared components instead of its own copy. Accessibility (focus, keyboard, ARIA, scroll locking) comes from Radix rather than hand-written code.

Look and behaviour stay the same for users unless a step below says otherwise. This is a refactor, not a redesign.

## Ground rules

- **Read first.** Read `CLAUDE.md` and the installed Next.js docs in `node_modules/next/dist/docs/`. Tailwind is v4 (`@import "tailwindcss"` and `@theme` in `styles/globals.css`); there is no `tailwind.config`.
- **Check before building.** Run `ls components/ui` and grep for existing behaviour before writing any component. One shared component per job; no near-copies.
- **Keep the look.** Restyle each shadcn component to match the current one (colours, radius, spacing). Never add shadows to new surfaces; keep existing glass surfaces glassy. Don't add `prefers-reduced-motion` handling (owner decision).
- **One component per PR,** in the order below. Each PR migrates every usage of that component, deletes the old one, and passes all checks.
- **Checks for every PR:** `npm run check` (types and lint, zero errors), `npm run test:unit`, and the Playwright specs that touch the component (`npm run test:e2e -- <spec>`). Check in a real browser at 375px and 1440px: no horizontal scroll, keyboard use works (Tab, Enter, Escape, arrow keys), focus returns to the trigger on close.
- **Commits:** small and focused, author only (no AI co-author lines). Don't commit `.claude/launch.json`.

## What exists today

| Component | Built with | Used in | Notes |
|---|---|---|---|
| `components/ui/DropdownMenu.tsx`, `Popover.tsx`, `menuSurface.ts` | **Radix** (done) | navbar user and bell menus, studio sort menu, booking-card overflow menu | Already the target pattern; use as the reference implementation |
| `components/modals/Modal.tsx` (213 lines) | hand-built (manual body scroll lock, overlay, Escape) | **28 files** (Login, Register, Rent, Filter, Share, admin modals, etc.) | Biggest job |
| `components/ui/Tooltip.tsx` (386 lines) | hand-built | 8 files | |
| `components/ui/Tabs.tsx` (301 lines) | hand-built + framer-motion; also exports `NavTabs` (link tabs) used by `AdminTabs` | 5 files (+6 via `NavTabs`/`AdminTabs`) | `TabsContent` has a new `keepMounted` prop used by the footer's "Explore studios" (SEO: hidden panels must stay in the HTML) |
| `components/ui/Switch.tsx` (73 lines) | hand-built | 5 files | |
| `components/ui/Checkbox.tsx` (56 lines) | hand-built | 6 files | |
| `components/ui/DatePicker.tsx` (269 lines) | hand-built | 2 files | |
| `components/ui/Select.tsx`, `AutoComplete.tsx` | `react-select` | 10 files + 1 | |
| Location search: `components/listing/LocationCombobox.tsx`, `LocationSheet.tsx`, `LocationPickerBody.tsx`, `LocationPickerRows.tsx` (~600 lines) | hand-built combobox, dropdown and full-screen sheet | studios feed header, landing pages | Own outside-click, focus and `fixed inset-0` dialog |

## Plan

### 0. Set up shadcn (½ day)

1. `npx shadcn@latest init`, choosing: style "new-york", TypeScript, Tailwind v4, CSS variables **on**, aliases `@/components/ui` and `@/lib/utils`.
2. Map shadcn's CSS variables (`--background`, `--foreground`, `--muted`, `--border`, `--ring`, `--radius`, etc.) to the existing tokens in `styles/globals.css`. Don't introduce a second palette.
3. Keep `cn()` in `lib/utils.ts` (shadcn expects it).
4. Commit `components.json`. Verify nothing visual changed.

### 1. Tooltip, Switch, Checkbox (1 day)

- `npx shadcn add tooltip switch checkbox`. Restyle to the current look (sizes, colours, focus ring).
- Keep each component's current props where possible, so call sites barely change. Tooltip wraps the app once with `TooltipProvider`; `Button`'s `tooltip` prop must keep working.
- Migrate all usages, delete the old implementations, and run the specs that use them (`payment-details`, `edit-property`, `rent-modal`, admin specs).

### 2. Tabs (½ day)

- `npx shadcn add tabs` (Radix Tabs). Keep the current look, including the sliding active pill (framer-motion `layoutId`) if the owner wants it kept.
- Radix `TabsContent` has `forceMount`: use it in place of today's `keepMounted`, which the footer "Explore studios" needs for SEO.
- `NavTabs`/`AdminTabs` are link-based navigation, not ARIA tabs. Keep them as links (`<nav>` with `aria-current="page"`), moved to their own file `components/ui/NavTabs.tsx`.
- Specs: admin specs (`admin-staff`, `admin-listings`).

### 3. Dialog and Sheet, replacing Modal (2–3 days)

- `npx shadcn add dialog sheet`. Build `components/ui/Dialog.tsx` styled like today's `Modal`: title bar, close button, body, footer with primary/secondary actions, loading state, `testId`.
- Recommended path: rewrite `components/modals/Modal.tsx` as a thin adapter over the new Dialog with **the same props** (`isOpen`, `onCloseAction`, `onSubmitAction`, `title`, `body`, `footer`, `actionLabel`, `secondaryActionAction`, `disabled`, `isLoading`, `disableOverlayClose`, `nestedModal`, `primaryActionVariant`, `actionDisabled`, `customWidth`, `fixedHeight`, `testId`). All 28 call sites keep working, and Radix replaces the manual scroll lock, Escape and focus code.
- Then move call sites to `Dialog` directly, in small batches, and delete the adapter last.
- `nestedModal`: Radix supports stacked dialogs; check Login → Register and Rent → Package.
- Watch out for: `RentModal` (multi-step, uploads), `FilterModal` (phone full-screen, so it should become a `Sheet` on mobile), and the `data-testid`s that `tests/e2e/support/ui.ts` relies on (`login-modal`, `register-modal`, `owner-register-modal`, `*-primary-action`).
- Specs: run the **whole** e2e suite; most flows open a modal.

### 4. Location search (1–2 days)

- `npx shadcn add command` (cmdk) for the combobox list.
- Desktop: `LocationCombobox` becomes `Popover` + `Command`.
- Phone: `LocationSheet` becomes `Sheet` (from step 3) + the same `Command` list.
- Share one list component: `LocationPickerBody`/`LocationPickerRows` become the `Command` items (detect location, recents, suggestions). Keep all behaviour of `useBrowseLocation` (URL, cookie, saved location, sort reset). Don't change any query logic.
- Delete the hand-built outside-click, positioning and `fixed inset-0` code.
- Specs: `filters`, `studio-feed`, `studio-feed-service`; check keyboard (type, arrow keys, Enter, Escape) on phone and desktop.

### 5. Select and DatePicker (1–2 days, optional)

- `react-select` works and supports async search; keep it unless a shadcn `Select`/`Combobox` covers every usage (check `Select.tsx`'s async and multi uses first).
- `DatePicker`: `npx shadcn add calendar popover` (react-day-picker). Migrate the 2 usages, keeping the booking-date rules (disabled days, IST dates) exactly as they are.

### 6. Clean-up (½ day)

- Remove any dependency no longer used (framer-motion stays if other animations use it).
- `rg "components/modals/Modal\"|ui/Tooltip\"|fixed inset-0"` should only show the new components.
- Update `CLAUDE.md` with a short "UI components" section: shadcn/Radix in `components/ui`, and "check `components/ui` before building any UI".

## Definition of done

- Every listed primitive comes from shadcn/Radix in `components/ui`; old implementations are deleted, with no duplicates left.
- `npm run check` and `npm run test:unit` pass; the **full** Playwright suite passes on a production build (`next build` then `next start`, then `E2E_BASE_URL=... E2E_START_LOCAL_SERVER=false npx playwright test`), run with nothing else using the test database.
- Visual check at 375px and 1440px for every migrated component: same look, no horizontal scroll, keyboard and focus work.
