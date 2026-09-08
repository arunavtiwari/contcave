# Email Infrastructure & Governance

This document outlines the standardized email system for ContCave, detailing the registry, delivery triggers, and maintenance protocols.

## 1. Universal Registry

All email logic is centralized in `lib/email/templates.ts`. We utilize a **Premium HTML (In-Code) Architecture** for all email flows to maintain high-fidelity design control:

| Flow Name | Trigger Function | Strategy | Recipient |
| :--- | :--- | :--- | :--- |
| **Guest Onboarding** | `getCustomerOnboardingTemplate` | HTML String | Guest |
| **Host Onboarding** | `getHostOnboardingTemplate` | HTML String | Host |
| **Password Reset** | `getResetPasswordTemplate` | HTML String | User |
| **Reservation Confirmation (Guest)** | `sendReservationConfirmationCustomer` | HTML String | Guest |
| **Reservation Confirmation (Host)** | `sendReservationConfirmationOwner` | HTML String | Host |
| **Reservation Request Received (Guest)** | `sendReservationReceivedCustomer` | HTML String | Guest |
| **Reservation Request Pending (Host)** | `sendReservationPendingOwner` | HTML String | Host |
| **Reservation Failed** | `sendReservationFailedEmail` | HTML String | Guest |

---

## 2. Trigger Lifecycle

### Onboarding
To maintain role-specific experiences, onboarding is split by lifecycle events:
*   **Guests**: Triggered immediately by `registerUserAction` in `app/actions/authActions.ts`.
*   **Hosts**: Triggered only after **Full Verification** (Email, Phone, Aadhaar, Bank) is marked as `is_verified` in `lib/verification/service.ts`.

### Reservation Confirmations & Failures
*   **Guest (Instant Success)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment for instant booking listings. Receives a booking confirmation email with the official **Tax Invoice PDF** attached.
*   **Guest (Approval Payment)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment for approval-required listings. Receives a booking request email with a customer-facing **Payment Receipt PDF** attached. In accounting/admin views this is tracked as a receipt voucher. The tax invoice is generated only after host approval.
*   **Host (Instant Success)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment for instant booking listings. Receives a confirmed booking notification and payout details.
*   **Host (Approval Payment)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment for approval-required listings. Receives a pending booking request notification and must approve or reject it.
*   **Guest (Approval/Rejection/Timeout Refund)**: Refund flows attach a **Refund Voucher PDF** and do not create a customer tax invoice.
*   **Guest (Failure)**: Triggered by `ReservationService.handleFailedPayment` when a payment is marked as `FAILED`. Receives a failed transaction notification.

---

## 3. Maintenance Governance

> [!IMPORTANT]
> To ensure architectural consistency, follow these governance rules:

*   **HTML Design**: Edit the raw strings in `lib/email/templates.ts` for all email layouts.
*   **Redirects**: Always use `getValidatedBaseUrl()` from `lib/utils.ts` so CTAs use the validated canonical application origin across staging and production.

---

## 4. Environment Keys

Required variables for the mailer system:
*   **MailerSend API**: `MAILERSEND_API_KEY`
*   **Authorized Sender**: `MAILERSEND_FROM_EMAIL`
