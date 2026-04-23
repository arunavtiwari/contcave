# Email Infrastructure & Governance

This document outlines the standardized email system for ContCave, detailing the registry, delivery triggers, and maintenance protocols.

## 1. Universal Registry

All email logic is centralized in `lib/email/templates.ts`. We utilize a **Hybrid Architecture**:
1.  **Premium HTML (In-Code)**: For high-fidelity onboarding and security flows.
2.  **Dashboard-Managed (Transactional)**: For reservation confirmations and invoicing.

| Flow Name | Trigger Function | Strategy | Recipient |
| :--- | :--- | :--- | :--- |
| **Guest Onboarding** | `getCustomerOnboardingTemplate` | HTML String | Guest |
| **Host Onboarding** | `getHostOnboardingTemplate` | HTML String | Host |
| **Password Reset** | `getResetPasswordTemplate` | HTML String | User |
| **Reservation Confirmation (Guest)** | `sendReservationConfirmationCustomer` | MailerSend Wrapper | Guest |
| **Reservation Confirmation (Host)** | `sendReservationConfirmationOwner` | MailerSend Wrapper | Host |

---

## 2. Trigger Lifecycle

### Onboarding
To maintain role-specific experiences, onboarding is split by lifecycle events:
*   **Guests**: Triggered immediately upon registration in `api/register/route.ts`.
*   **Hosts**: Triggered only after **Full Verification** (Email, Phone, Aadhaar, Bank) is marked as `is_verified` in `lib/verification/service.ts`.

### Reservation Confirmations
Triggered by `ReservationService.triggerInitialNotifications` upon successful payment:
*   **Guest**: Receives a confirmation email with their official **Invoice PDF** attached.
*   **Host**: Receives a notification of the new booking and payout details.

---

## 3. Maintenance Governance

> [!IMPORTANT]
> To ensure architectural consistency, follow these governance rules:

*   **HTML Design**: Edit the raw strings in `lib/email/templates.ts` for onboarding and password resets.
*   **Transactional Content**: Edit the template content directly in the **MailerSend Dashboard** for reservation confirmations.
*   **Redirects**: Always use `process.env.NEXTAUTH_URL` to ensure CTAs work across Staging and Production.

---

## 4. Environment Keys

Required variables for the mailer system:
*   **MailerSend API**: `MAILERSEND_API_KEY`
*   **Authorized Sender**: `MAILERSEND_FROM_EMAIL`
*   **Guest Confirmation ID**: `MS_TPL_RESERVATION_CUSTOMER`
*   **Host Notification ID**: `MS_TPL_RESERVATION_OWNER`
