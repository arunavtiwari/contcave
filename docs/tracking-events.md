# Tracking events

Every analytics event the site sends, where it fires, and what it maps to. The goal is one
funnel that Google Analytics, Google Ads and Meta can all optimise against: **paid bookings**.

## How it is wired

| Piece | Where | Notes |
|---|---|---|
| Google Tag Manager | `app/(main)/layout.tsx` | Loaded once, in `<head>`. GA4 and Google Ads live inside the container; there is no GA4 code in the repo. |
| dataLayer events | `lib/analytics/tracking.ts` | One function per event. Never push to `dataLayer` anywhere else. |
| Meta Pixel | `components/analytics/MetaPixelScript.tsx` | Loaded after hydration. Events raised earlier are queued in `lib/metaPixel.ts`. |
| Meta Conversions API | `app/api/meta-capi/route.ts` | Sent with the same `event_id` as the Pixel event so Meta de-duplicates. |
| Consent | `components/providers/ConsentProvider.tsx`, `lib/consent.ts` | Visitors are opted in until they decline in the cookie banner. |

Rules that apply to every event:

- Each event carries an `event_id`. Use it as the Pixel `eventID` in any GTM Meta tag.
- `value` is always in INR and **excludes GST**; `tax` carries the GST.
- A booking is one item: `quantity: 1`, `price` equal to the event's `value` (the hourly rate on `view_item`).
- Dashboard, admin, payment and auth pages send no `page_view`, and their paths are shortened to the first segment.
- No email, phone or name ever goes into the dataLayer. Meta's server events add hashed account details on the server only.

## Booking funnel (demand)

In funnel order. Stages 5 and 8 are the two to optimise campaigns against.

| # | Stage | dataLayer event | Meta event | Fires when | Key parameters |
|---|---|---|---|---|---|
| 1 | Visit | `page_view` | PageView | Every public route change | `page_type` (home / listing / studio / content) |
| 2 | Search | `search` | Search | Search modal submitted | `search_term`, `search_date`, `search_has_sets` |
| 2 | Browse | `location_set`, `location_cleared`, `sort_changed` | — | Location or sort changed on the feed | `location_source`, `sort_value` |
| 3 | Studio viewed | `view_item` | ViewContent | Studio page opened (not by its owner or an admin) | `value`, `items[]` |
| 3 | Saved | `add_to_wishlist` | AddToWishlist | Studio added to favourites | `items[].item_id` |
| 4 | Date picked | `select_date` | — | A date is chosen in the booking calendar | `items[]` |
| 4 | Time picked | `select_time` | — | A start or end time is chosen | `items[]` |
| 5 | **Checkout started** | `begin_checkout` | InitiateCheckout | Reserve pressed by a signed-in customer; once per studio and amount | `value`, `tax`, `booking_type` |
| 6 | Phone requested | `checkout_step` (`personal_details`) | — | Only when the customer has no saved phone number | `step_name` |
| 6 | Summary shown | `checkout_step` (`review_booking`) | — | Booking summary opens | `step_name` |
| 7 | Sent to payment | `add_payment_info` | AddPaymentInfo | Summary confirmed, redirecting to Cashfree | `value`, `tax`, `payment_type` |
| 8 | **Booking paid** | `purchase` | Purchase | Payment return page shows success; once per booking ID | `transaction_id`, `value`, `tax`, `booking_type` |

## Leads and contact

| dataLayer event | Meta event | Fires when | Key parameters |
|---|---|---|---|
| `whatsapp_contact` | Contact (server only) | Any WhatsApp link clicked on a public page | `contact_source`: `curated_request_price`, `floating_button`, `equipment_on_request`, `whatsapp_link` |
| `generate_lead` | Lead | "Request a studio in my city" link | `lead_source`, `city` |
| `contact_click` | — | Email or phone link clicked | `contact_method` |

`curated_request_price` is the only conversion a curated studio has, so treat it as a primary
conversion alongside `purchase`.

## Accounts and supply

| dataLayer event | Meta event | Fires when | Key parameters |
|---|---|---|---|
| `sign_up` | CompleteRegistration | Email or Google registration succeeds; once per account | `method`, `account_type` (customer / owner) |
| `login` | — | Email sign-in succeeds | `method` |
| `listing_submitted` | SubmitApplication | A host submits a new studio listing | `listing_id` |

## Navigation

| dataLayer event | Fires when | Key parameters |
|---|---|---|
| `outbound_link_click` | Link to another website | `outbound_host`, `opens_new_tab` |
| `new_tab_link_click` | Internal link opened in a new tab | `destination_path` |

## Recommended setup in GTM, GA4 and Ads

These live outside the repo and need checking in the tools themselves.

- **GA4 tag**: turn off its automatic page view and the "page changes based on browser history"
  enhanced measurement, then send `page_view` from the custom event. Otherwise page views double.
- **GA4 event tags**: one per event above, with "Send ecommerce data" from the dataLayer on the
  ecommerce events (`view_item`, `add_to_wishlist`, `begin_checkout`, `add_payment_info`, `purchase`).
- **GA4 key events**: `purchase`, `begin_checkout`, `whatsapp_contact`, `generate_lead`, `sign_up`, `listing_submitted`.
- **Google Ads**: import `purchase` as the primary conversion with its value; `begin_checkout` and
  `whatsapp_contact` as secondary.
- **Meta**: optimise for Purchase; fall back to InitiateCheckout while Purchase volume is under
  roughly 50 a week. The site already sends Pixel and server copies, so GTM should only hold a
  Meta tag for `whatsapp_contact` (Contact), using `event_id` as the `eventID`.

## Not tracked yet

- **Server-side purchase**: `purchase` is sent from the browser. A customer who pays in a UPI app
  and never returns to the confirmation page is not counted. Sending it from the Cashfree webhook
  (Meta Conversions API and GA4 Measurement Protocol) would close this.
- **Refunds and declined requests**: an approval booking counts as a purchase when paid, even if
  the host later declines it. A `refund` event would keep revenue honest.
- **Feed impressions and clicks** (`view_item_list`, `select_item`): would show which cards and
  positions lead to bookings.
- **Google sign-in** (`login` with `method: google`) and Google owner sign-ups' `account_type`.
