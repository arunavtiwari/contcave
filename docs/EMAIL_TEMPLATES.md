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
| **Reservation Failed** | `sendReservationFailedEmail` | HTML String | Guest |

---

## 2. Trigger Lifecycle

### Onboarding
To maintain role-specific experiences, onboarding is split by lifecycle events:
*   **Guests**: Triggered immediately upon registration in `api/register/route.ts`.
*   **Hosts**: Triggered only after **Full Verification** (Email, Phone, Aadhaar, Bank) is marked as `is_verified` in `lib/verification/service.ts`.

### Reservation Confirmations & Failures
*   **Guest (Success)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment. Receives a confirmation email with their official **Invoice PDF** attached.
*   **Host (Success)**: Triggered by `ReservationService.triggerInitialNotifications` upon successful payment. Receives a notification of the new booking and payout details.
*   **Guest (Failure)**: Triggered by `ReservationService.handleFailedPayment` when a payment is marked as `FAILED`. Receives a failed transaction notification.

---

## 3. Maintenance Governance

> [!IMPORTANT]
> To ensure architectural consistency, follow these governance rules:

*   **HTML Design**: Edit the raw strings in `lib/email/templates.ts` for all email layouts.
*   **Redirects**: Always use `process.env.NEXTAUTH_URL` to ensure CTAs work across Staging and Production.

---

## 4. Environment Keys

Required variables for the mailer system:
*   **MailerSend API**: `MAILERSEND_API_KEY`
*   **Authorized Sender**: `MAILERSEND_FROM_EMAIL`
